import React, {Component} from 'react';
import {
  Button,
  Dimensions,
  Image,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {BleManager} from 'react-native-ble-plx';
import {Buffer} from 'buffer';
import moment from 'moment';
import {PermissionsAndroid} from 'react-native';

const screenWidth = Dimensions.get('window').width;

const airMonitorServiceUUID = 'db101875-d9c4-4c10-b856-fad3a581a6ea';
const tempCharacteristicUUID = '06576524-99f9-4dc5-b6ea-c66dc433e6f2';
const co2CharacteristicUUID = '4e1fb0da-dc91-43ea-9b6d-77f699ddbbed';
const graphCharactericUUID = '900dd909-eb3a-4774-bcdb-b10d8dd2ae28';

export default class HelloWorldApp extends Component {
  static navigationOptions = {
    title: 'Home',
    headerStyle: {
      backgroundColor: '#f4511e',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  };
  constructor() {
    super();
    this.manager = new BleManager();
    this.state = {
      isLoading: false,
      deviceID: '00:00:00:00:00:00',
      devices: [],
      connected: false,
      co2: 0,
      temp: 0,
      lastUpdate: '',
      chartData: {
        labels: ['time'],
        datasets: [
          {
            data: [0],
          },
        ],
      },
      chartConfig: {
        backgroundColor: '#e26a00',
        backgroundGradientFrom: '#fb8c00',
        backgroundGradientTo: '#ffa726',
        strokeWidth: 0.1,
        decimalPlaces: 2, // optional, defaults to 2dp
        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        style: {
          borderRadius: 16,
        },
        propsForDots: {
          r: '6',
          strokeWidth: '0.1',
          stroke: '#ffa726',
        },
      },
    };
  }
  async requestBlePermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        {
          title: 'Access Bluetooth',
          message:
            'In order to connect to the Air Monitor, this app requires Bluetooth access.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('You can use Bluetooth');
        this.setState({isLoading: false});
      } else {
        console.log('Bluetooth permission denied');
        this.setState({isLoading: false});
      }
    } catch (err) {
      console.warn(err);
    }
  }
  async setupNotifications(device) {
    device.monitorCharacteristicForService(
      airMonitorServiceUUID,
      tempCharacteristicUUID,
      (error, characteristic) => {
        if (error) {
          console.log(error.message);
          ToastAndroid.show(error.message, ToastAndroid.SHORT);
          this.setState({connected: false});

          return;
        }
        let converted = Buffer.from(characteristic.value, 'base64').toString(
          'ascii',
        );
        //console.log('Got value: ' + converted);
        let lastUpdate = moment(new Date());
        this.setState({temp: converted, lastUpdate});
        this.setState({connected: true});
      },
    );
    device.monitorCharacteristicForService(
      airMonitorServiceUUID,
      co2CharacteristicUUID,
      (error, characteristic) => {
        if (error) {
          console.log(error.message);
          ToastAndroid.show(error.message, ToastAndroid.SHORT);
          this.setState({connected: false});

          return;
        }
        let converted = Buffer.from(characteristic.value, 'base64').toString(
          'ascii',
        );
        // console.log('Got value: ' + converted);
        let lastUpdate = moment(new Date());
        this.setState({co2: converted, lastUpdate});
        this.setState({connected: true});
      },
    );
    device.monitorCharacteristicForService(
      airMonitorServiceUUID,
      graphCharactericUUID,
      (error, characteristic) => {
        if (error) {
          console.log(error.message);
          ToastAndroid.show(error.message, ToastAndroid.SHORT);
          this.setState({connected: false});
          return;
        }
        let converted = Buffer.from(characteristic.value, 'base64').toString(
          'ascii',
        );
        try {
          let data = JSON.parse(converted);
          let nowMs = data[2].timenow;
          if (data[2].dataID != 0) {
            return;
          }
          console.log(data);
          console.log(data[2].dataID);
          let dataset = this.state.chartData;
          // reset if we have received all the data before
          if (data[2].sequenceID == 0) {
            dataset.datasets[0].data = [];
            dataset.labels = [];
          }
          // setup our labels
          dataset.labels = [];
          for (let i = 0; i < data[2].count; i++) {
            let newMoment = new moment()
              .subtract(nowMs - data[1][i])
              .format('HH:mm');
            if (i % 3 == 0) {
              dataset.labels.push(newMoment);
            } else {
              dataset.labels.push('');
            }
          }
          for (let i = 0; i < data[2].count; i++) {
            dataset.datasets[0].data.push(data[0][i]);
          }
          this.setState({chartData: dataset});
        } catch (error) {
          console.log('Error passing JSON');
          console.log(error);
        }
      },
    );
  }
  handleConnectButton() {
    this.setState({isLoading: true});
    console.log('Handling button press');
    if (this.state.connected) {
      this.manager.cancelDeviceConnection(this.state.deviceID).then(() => {
        this.setState({isLoading: false});
      });
    } else {
      this.scanAndConnect();
    }
  }
  componentDidMount() {
    try {
      this.requestBlePermission().then(() => {
        const subscription = this.manager.onStateChange(state => {
          if (state === 'PoweredOn') {
            this.scanAndConnect();
            subscription.remove();
          }
        }, true);
      });
    } catch (error) {
      console.log('Error setting up Bluetooth.' + error.message);
    }
  }
  scanAndConnect() {
    this.setState({isLoading: true});
    this.manager.startDeviceScan(
      null,
      {autoConnect: true, requestMTU: 512},
      (error, device) => {
        console.log('Scanning...');
        console.log(device);

        if (error) {
          console.log(error.message);
          ToastAndroid.show(error.message, ToastAndroid.SHORT);
          this.setState({connected: false, isLoading: false});
          this.requestBlePermission();
          return;
        }

        if (device.name === 'Air Quality Monitor') {
          console.log('Connecting to Air Quality Monitor');
          this.manager.stopDeviceScan();
          device
            .connect()
            .then(device => {
              console.log('Discovering services and characteristics');
              return device.discoverAllServicesAndCharacteristics();
            })
            .then(device => {
              console.log('Setting notifications');
              this.setState({deviceID: device.id});
              return this.setupNotifications(device);
            })
            .then(
              () => {
                console.log('Listening...');
                this.manager
                  .requestMTUForDevice(device.id, 512)
                  .then(mtu => {
                    // Success code
                    console.log(
                      'MTU size changed to ' +
                        mtu.mtu +
                        ' bytes' +
                        ' from ' +
                        device.mtu,
                    );
                  })
                  .catch(error => {
                    // Failure code
                    console.log(error);
                  });
              },
              error => {
                console.log(error.message);
                this.setState({connected: false});
              },
            )
            .finally(() => {
              this.setState({isLoading: false});
            });
        }
      },
    );
  }

  render() {
    const list = this.state.devices;
    const lastUpdate = this.state.lastUpdate
      ? moment(this.state.lastUpdate).fromNow()
      : 'Not connected';
    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{alignItems: 'center', flex: 1}}>
          <Image
            source={require('./favicon.png')}
            style={{width: 230 / 4, height: 266 / 4, resizeMode: 'stretch'}}
          />
          <Text style={{alignContent: 'center', fontSize: 18}}>
            Air Quality Monitor
          </Text>
          <Text>
            {list.map((l, i) => (
              <Text key={i}>{l}</Text>
            ))}{' '}
          </Text>
          <Text>Temperature: {this.state.temp}</Text>
          <Text>CO2: {this.state.co2}</Text>
          <Text>Last update: {lastUpdate}</Text>
          <Button
            title={this.state.connected ? 'Disconnect' : 'Connect'}
            disabled={this.state.isLoading}
            onPress={() => this.handleConnectButton()}
          />
          <LineChart
            data={this.state.chartData}
            width={Dimensions.get('window').width} // from react-native
            height={Dimensions.get('window').height * 0.7}
            yAxisLabel={''}
            chartConfig={this.state.chartConfig}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
          <Text>{this.state.connected ? 'Connected' : 'Not connected'}</Text>
        </View>
      </View>
    );
  }
}
