import React, {Component} from 'react';
import {
  Button,
  Dimensions,
  Image,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import {
  scanAndConnect,
  handleConnectButton,
  processGraph,
  requestBlePermission,
  setupNotifications,
} from './Functions';
import {LineChart} from 'react-native-chart-kit';
import {BleManager} from 'react-native-ble-plx';
import {VictoryChart, VictoryLine} from 'victory-native';
import {Buffer} from 'buffer';
import moment from 'moment';
import {PermissionsAndroid} from 'react-native';

const screenWidth = Dimensions.get('window').width;

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
      labels: ['Time'],
      dataID: 0,
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
    this.scanAndConnect = scanAndConnect.bind(this);
    this.request;
    this.handleConnectButton = handleConnectButton.bind(this);
    this.processGraph = processGraph.bind(this);
    this.requestBlePermission = requestBlePermission.bind(this);
    this.setupNotifications = setupNotifications.bind(this);
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
