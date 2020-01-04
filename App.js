import React, {Component} from 'react';
import {
  Button,
  Dimensions,
  Image,
  Text,
  ToastAndroid,
  View,
  ScrollView,
} from 'react-native';
import {
  scanAndConnect,
  handleConnectButton,
  processGraph,
  requestBlePermission,
  setupNotifications,
} from './Functions';
import {BleManager} from 'react-native-ble-plx';
import {VictoryChart, VictoryLine} from 'victory-native';
import moment from 'moment';

const screenWidth = Dimensions.get('window').width;
const colorSwitcher: any = {
  stroke: (data: any) => {
    let color = 'orange';

    if (data.y > 0 && data.y <= 850) {
      color = 'green';
    }

    if (data.y > 850 && data.y <= 1250) {
      color = 'yellow';
    }

    if (data.y > 1250 && data.y <= 1500) {
      color = 'red';
    }

    if (data.y > 1500 && data.y <= 5000) {
      color = 'purple';
    }

    return color;
  },
  strokeWidth: 1.5,
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
      isLoading: false,
      deviceID: '00:00:00:00:00:00',
      devices: [],
      connected: false,
      co2: 0,
      temp: 0,
      lastUpdate: '',
      labels: ['Time'],
      dataID: 0,
      data: [
        {x: new moment(), y: 0},
        {x: new moment(), y: 0},
        {x: new moment(), y: 0},
      ],
    };
    this.scanAndConnect = scanAndConnect.bind(this);
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
    const data = this.state.data;
    return (
      <View style={{flex: 1, flexDirection: 'column'}}>
        <View
          style={{
            flex: 7,
            alignItems: 'center',
          }}>
          <Image
            source={require('./favicon.png')}
            style={{width: 230 / 4, height: 266 / 4, resizeMode: 'stretch'}}
          />
          <ScrollView>
            <Text style={{fontSize: 18}}>Air Quality Monitor</Text>
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
          </ScrollView>
        </View>
        <View style={{flex: 16}}>
          {this.state.connected && (
            <VictoryChart
              height={Dimensions.get('window').height * ((1 / 24) * 16)}>
              <VictoryLine
                style={{data: {...colorSwitcher}}}
                scale={{x: 'time'}}
                data={data}
              />
            </VictoryChart>
          )}
        </View>
        <View style={{flex: 1}}>
          <Text>{this.state.connected ? 'Connected' : 'Not connected'}</Text>
        </View>
      </View>
    );
  }
}
