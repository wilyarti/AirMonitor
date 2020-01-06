import React, {Component} from 'react';
import {Button, Dimensions, Image, ScrollView, Text, View} from 'react-native';
import {
  getColor,
  handleConnectButton,
  processGraph,
  requestBlePermission,
  scanAndConnect,
  setupNotifications,
} from './Functions';
import {BleManager} from 'react-native-ble-plx';
import {
  VictoryArea,
  VictoryAxis,
  VictoryChart,
  VictoryLine,
} from 'victory-native';
import {
  Defs,
  Stop,
  LinearGradient,
  Svg,
  ClipPath,
  Rect,
} from 'react-native-svg';
import moment from 'moment';

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
    const data = this.state.data;
    let min = 0;
    let max = 0;
    this.state.data.map(point => {
      if (point.y <= min) {
        min = point.y;
      }
      if (point.y >= max) {
        max = point.y;
      }
    });
    const colorBottom = getColor(min);
    const colorTop = getColor(max);

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
              <Defs>
                <LinearGradient
                  id="myGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%">
                  <Stop offset="0%" stopColor={colorTop} />
                  <Stop offset="100%" stopColor={colorBottom} />
                </LinearGradient>
              </Defs>
              <VictoryArea
                id={'line-1'}
                name="CO2 PPM"
                style={{
                  data: {
                    stroke: 'url(#myGradient)',
                    fill: 'url(#myGradient)',
                  },
                  strokeWidth: 2,
                }}
                scale={{x: 'time', y: 'linear'}}
                interpolation="natural"
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
