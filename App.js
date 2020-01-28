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
  VictoryLine,
  VictoryGroup,
  VictoryChart,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryTooltip,
  VictoryLegend,
} from 'victory-native';
import {Defs, LinearGradient, Stop} from 'react-native-svg';
import moment from 'moment';
import DATA from './data';
import DATA_TVOC from './dataTVOC';

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
      mockup: false,
      isLoading: false,
      deviceID: '00:00:00:00:00:00',
      devices: [],
      connected: false,
      co2: 0,
      tvoc: 0,
      lastUpdate: '',
      labels: ['Time'],
      dataID: 0,
      data: [
        {x: new moment(), y: 0},
        {x: new moment(), y: 0},
        {x: new moment(), y: 0},
      ],
      dataTVOC: [
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
    if (this.state.mockup) {
      let data = DATA.map((_, index) => {
        let point = DATA[index];
        point.x = new moment(point.x);
        return point;
      });
      let dataTVOC = DATA_TVOC.map((_, index) => {
        let point = DATA_TVOC[index];
        point.x = new moment(point.x);
        return point;
      });

      this.setState({data, dataTVOC, isLoading: false, connected: true});
      return;
    }
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
    const dataTVOC = this.state.dataTVOC;
    let maxTvoc = 0;
    let maxTvocTime;
    let maxCo2 = 0;
    let maxCo2Time;
    data.map(point => {
      if (point.y >= maxCo2) {
        maxCo2 = point.y;
        maxCo2Time = point.x;
      }
    });
    dataTVOC.map(point => {
      if (point.y >= maxTvoc) {
        maxTvoc = point.y;
        maxTvocTime = point.x;
      }
    });
    /*
    console.log("TVOC");
    console.log(this.state.dataTVOC);
    console.log("CO2");
    console.log(this.state.data);
*/
    return (
      <View style={{flex: 1, flexDirection: 'column'}}>
        <View
          style={{
            flex: 2,
            alignItems: 'center',
          }}>
          <View style={{flexDirection: 'row', alignContent: 'center'}}>
            <Image
              source={require('./favicon.png')}
              style={{width: 230 / 4, height: 266 / 4, resizeMode: 'stretch'}}
            />
          </View>
          <Text style={{fontSize: 18}}>Air Quality Monitor</Text>
        </View>

        <View
          style={{
            flex: 2,
            justifyContent: 'flex-end',
          }}>
          <View style={{flexDirection: 'row'}}>
            <View style={{flex: 1}}>
              <Text>
                Max CO2: {maxCo2}
                {maxCo2 && ' ' && !this.state.mockup
                  ? ' ' + maxCo2Time.fromNow()
                  : ''}
              </Text>
              <Text>
                Max TVOX: {maxTvoc}
                {maxTvocTime && !this.state.mockup
                  ? ' ' + maxTvocTime.fromNow()
                  : ''}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text>Live TVOC: {this.state.tvoc}</Text>
              <Text>Live CO2: {this.state.co2}</Text>
            </View>
          </View>
        </View>

        <View style={{flex: 13}}>
          {this.state.connected && (
            <VictoryChart
              scale={{x: 'time', y: 'linear'}}
              height={Dimensions.get('window').height * ((1 / 19) * 13)}
              domainPadding={{y: 10}}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({datum}) => `y: ${datum.y}`}
                  labelComponent={
                    <VictoryTooltip
                      cornerRadius={0}
                      flyoutStyle={{fill: 'white'}}
                    />
                  }
                />
              }>
              <VictoryLegend
                x={150}
                y={50}
                title="Legend"
                centerTitle
                orientation="horizontal"
                gutter={20}
                style={{border: {stroke: 'black'}, title: {fontSize: 20}}}
                data={[
                  {name: 'CO2 PPM', symbol: {fill: 'tomato', type: 'star'}},
                  {name: 'TVOC PPM', symbol: {fill: 'blue'}},
                ]}
              />
              <VictoryLine
                data={this.state.data}
                style={{
                  data: {
                    stroke: 'tomato',
                    strokeWidth: ({active}) => (active ? 4 : 2),
                  },
                  labels: {fill: 'tomato'},
                }}
              />

              <VictoryLine
                data={this.state.dataTVOC}
                style={{
                  data: {
                    stroke: 'blue',
                    strokeWidth: ({active}) => (active ? 4 : 2),
                  },
                  labels: {fill: 'blue'},
                }}
              />
            </VictoryChart>
          )}
        </View>
        <View
          style={{flex: 2, flexDirection: 'row', justifyContent: 'flex-end'}}>
          <View style={{flex: 1, flexDirection: 'column'}}>
            <Text>{this.state.connected ? 'Connected' : 'Not connected'}</Text>
          </View>
          <View style={{flex: 1, flexDirection: 'column'}}>
            <Button
              title={this.state.connected ? 'Disconnect' : 'Connect'}
              disabled={this.state.isLoading}
              onPress={() => this.handleConnectButton()}
            />
          </View>
        </View>
      </View>
    );
  }
}
