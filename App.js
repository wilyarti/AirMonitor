import React, {Component} from 'react';
import {
  Text,
  View,
  ListItem,
  Image,
  Button,
  Platform,
  StyleSheet,
} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {Dimensions} from 'react-native';

const screenWidth = Dimensions.get('window').width;

import {BleManager} from 'react-native-ble-plx';
import {ToastAndroid} from 'react-native';
import {Buffer} from 'buffer';
import moment from 'moment';

const airMonitorServiceUUID = 'db101875-d9c4-4c10-b856-fad3a581a6ea';
const tempCharacteristicUUID = '06576524-99f9-4dc5-b6ea-c66dc433e6f2';
const co2CharacteristicUUID = '4e1fb0da-dc91-43ea-9b6d-77f699ddbbed';
const graphCharactericUUID = '900dd909-eb3a-4774-bcdb-b10d8dd2ae28';

const chartConfig = {
  backgroundGradientFrom: '#1E2923',
  backgroundGradientTo: '#08130D',
  color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
  strokeWidth: 2, // optional, default 3
};

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
            data: [0
            ],
          },
        ],
      },
    };
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
          // reset if we have recieved all the data before
          if (dataset.datasets[0].data.length > 256) {
            dataset.datasets[0].data = [];
          }
          // setup our labels
          dataset.labels = [];
          for (let i = 0; i < data[2].count; i += 10) {
            let newMoment = new moment()
              .subtract(nowMs - data[1][i])
              .format('HH:mm');
            console.log(newMoment);
            dataset.labels.push(newMoment);
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
    console.log('Handling button press');
    if (this.state.connected) {
      this.manager.cancelDeviceConnection(this.state.deviceID);
    } else {
      this.scanAndConnect();
    }
  }
  componentDidMount() {
    const subscription = this.manager.onStateChange(state => {
      if (state === 'PoweredOn') {
        this.scanAndConnect();
        subscription.remove();
      }
    }, true);
  }
  scanAndConnect() {
    this.manager.startDeviceScan(
      null,
      {autoConnect: true, requestMTU: 512},
      (error, device) => {
        console.log('Scanning...');
        console.log(device);

        if (error) {
          console.log(error.message);
          ToastAndroid.show(error.message, ToastAndroid.SHORT);
          this.setState({connected: false});
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
            );
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
            onPress={() => this.handleConnectButton()}
          />
          <LineChart
            data={this.state.chartData}
            width={Dimensions.get('window').width} // from react-native
            height={Dimensions.get('window').height * 0.7}
            yAxisLabel={''}
            chartConfig={{
              backgroundColor: '#e26a00',
              backgroundGradientFrom: '#fb8c00',
              backgroundGradientTo: '#ffa726',
              decimalPlaces: 2, // optional, defaults to 2dp
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
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
