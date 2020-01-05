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
import {
  VictoryArea,
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryGroup,
} from 'victory-native';
import moment from 'moment';
import {Defs, LinearGradient, Stop} from 'react-native-svg';
import VClipPath from 'victory-native/lib/components/victory-primitives/clip-path';
import VRect from 'victory-native/lib/components/victory-primitives/rect';

const screenWidth = Dimensions.get('window').width;

export default class AirMonitor extends Component {
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
    const redData = [
      {x: new moment(), y: 0},
      {x: new moment(), y: 0},
      {x: new moment(), y: 0},
    ];
    const greenData = [
      {x: new moment(), y: 0},
      {x: new moment(), y: 0},
      {x: new moment(), y: 0},
    ];
    this.state.data.map(point => {
      if (point.y >= 700) {
        redData.push(point);
      } else {
        greenData.push(point);
      }
    });

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
                style={{
                  data: {stroke: 'red'},
                  parent: {border: '1px solid #ccc'},
                }}
                scale={{x: 'time'}}
                data={redData}
              />
              <VictoryLine
                style={{
                  data: {stroke: 'green'},
                  parent: {border: '1px solid #ccc'},
                }}
                scale={{x: 'time'}}
                data={greenData}
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
