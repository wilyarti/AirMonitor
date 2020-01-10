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
import {VictoryArea, VictoryGroup, VictoryChart} from 'victory-native';
import {Defs, LinearGradient, Stop} from 'react-native-svg';
import moment from 'moment';

const screenWidth = Dimensions.get('window').width;

function parsePercentage(number) {
  if (number <= 100 && number >= 0) {
    return number;
  } else {
    return 0;
  }
}
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
    let minTime;
    let max = 0;
    let maxTime;
    this.state.data.map(point => {
      if (point.y <= min) {
        min = point.y;
        minTime = point.x;
      }
      if (point.y >= max) {
        max = point.y;
        maxTime = point.x;
      }
    });
    let bluePercentage = parseInt(100 - (500 / max) * 100);
    let greenPercentage = parseInt(100 - (1000 / max) * 100);
    let yellowPercentage = parseInt(100 - (1500 / max) * 100);
    let orangePercentage = parseInt(100 - (2000 / max) * 100);
    let redPercentage = parseInt(100 - (2500 / max) * 100);
    let purplePercentage = parseInt(100 - (5000 / max) * 100);
    if (max < 2500) {
      purplePercentage = 0;
    } else if (max < 2000) {
      redPercentage = 0;
    } else if (max < 1500) {
      orangePercentage = 0;
    } else if (max < 1000) {
      yellowPercentage = 0;
    } else if (max < 500) {
      greenPercentage = 0;
    }
    bluePercentage = parsePercentage(bluePercentage);
    greenPercentage = parsePercentage(greenPercentage);
    yellowPercentage = parsePercentage(yellowPercentage);
    orangePercentage = parsePercentage(orangePercentage);
    redPercentage = parsePercentage(redPercentage);
    purplePercentage = parsePercentage(purplePercentage);

    console.log('Percentages: ');
    console.log(
      bluePercentage +
        ' ' +
        greenPercentage +
        ' ' +
        yellowPercentage +
        ' ' +
        orangePercentage +
        ' ' +
        redPercentage +
        ' ' +
        purplePercentage,
    );

    return (
      <View style={{flex: 1, flexDirection: 'column'}}>
        <View
          style={{
            flex: 4,
            alignItems: 'center',
          }}>
          <View style={{flexDirection: 'row'}}>
            <View style={{flex: 1}}>
              <Image
                source={require('./favicon.png')}
                style={{width: 230 / 4, height: 266 / 4, resizeMode: 'stretch'}}
              />
            </View>
            <View style={{flex: 2}}>
              <Text style={{fontSize: 18}}>Air Quality Monitor</Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flex: 7,
            alignItems: 'center',
          }}>
          <View style={{flexDirection: 'row'}}>
            <View style={{flex: 1}}>
              <Text>
                Min: {min} {minTime ? minTime.fromNow() : ''}
              </Text>
              <Text>
                Max: {max} {maxTime ? maxTime.fromNow() : ''}
              </Text>
              <Button
                title={this.state.connected ? 'Disconnect' : 'Connect'}
                disabled={this.state.isLoading}
                onPress={() => this.handleConnectButton()}
              />
            </View>
            <View style={{flex: 1}}>
              <Text>Temperature: {this.state.temp}</Text>
              <Text>CO2: {this.state.co2}</Text>
            </View>
          </View>
        </View>

        <View style={{flex: 16}}>
          {this.state.connected && (
            <VictoryGroup>
              <VictoryChart
                height={Dimensions.get('window').height * ((1 / 24) * 16)}>
                <VictoryArea
                  id={'line-1'}
                  name="CO2 PPM"
                  style={{
                    data: {
                      fill: 'url(#myGradient)',
                    },
                    strokeWidth: 2,
                  }}
                  interpolation="natural"
                  data={data}
                  scale={{x: 'time', y: 'linear'}}
                />
                <Defs>
                  <LinearGradient
                    id="myGradient"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%">
                    <Stop offset={bluePercentage + '%'} stopColor="blue" />
                    <Stop offset={greenPercentage + '%'} stopColor="green" />
                    <Stop offset={yellowPercentage + '%'} stopColor="yellow" />
                    <Stop offset={orangePercentage + '%'} stopColor="orange" />
                    <Stop offset={redPercentage + '%'} stopColor="red" />
                    <Stop offset={purplePercentage + '%'} stopColor="purple" />
                  </LinearGradient>
                </Defs>
              </VictoryChart>
            </VictoryGroup>
          )}
        </View>
        <View style={{flex: 2, flexDirection: 'row'}}>
          <View style={{flex: 1}}>
            <Text>{this.state.connected ? 'Connected' : 'Not connected'}</Text>
          </View>
        </View>
      </View>
    );
  }
}
