import React, {Component} from 'react';
import {Text, View, ListItem, Image} from 'react-native';
import {BleManager} from 'react-native-ble-plx';
import {ToastAndroid} from 'react-native';
import {Buffer} from 'buffer';
import {headerImage} from './favicon.png';
const airMonitorServiceUUID = 'db101875-d9c4-4c10-b856-fad3a581a6ea';
const tempCharacteristicUUID = '06576524-99f9-4dc5-b6ea-c66dc433e6f2';
const co2CharacteristicUUID = '4e1fb0da-dc91-43ea-9b6d-77f699ddbbed';

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
      devices: [],
      connected: false,
      co2: 0,
      temp: 0,
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
          return;
        }
        let converted = Buffer.from(characteristic.value, 'base64').toString(
          'ascii',
        );
        console.log('Got value: ' + converted);
        this.setState({temp: converted});
      },
    );
    device.monitorCharacteristicForService(
      airMonitorServiceUUID,
      co2CharacteristicUUID,
      (error, characteristic) => {
        if (error) {
          console.log(error.message);
          ToastAndroid.show(error.message, ToastAndroid.SHORT);
          return;
        }
        let converted = Buffer.from(characteristic.value, 'base64').toString(
          'ascii',
        );
        console.log('Got value: ' + converted);
        this.setState({co2: converted});
      },
    );
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
    this.manager.startDeviceScan(null, null, (error, device) => {
      console.log('Scanning...');
      console.log(device);

      if (error) {
        this.error(error.message);
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
            return this.setupNotifications(device);
          })
          .then(
            () => {
              console.log('Listening...');
              this.setState({connected: true});
            },
            error => {
              console.log(error.message);
              this.setState({connected: false});
            },
          );
      }
    });
  }

  render() {
    const list = this.state.devices;
    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
        <View style={{alignItems: 'center'}}>
          <Image
            source={require('./favicon.png')}
            style={{width: 230 / 4, height: 266 / 4, resizeMode: 'stretch'}}
          />
          <View>
            <Text style={{alignContent: 'center', fontSize: 18}}>
              Air Quality Monitor
            </Text>
          </View>
        </View>
        <View style={{alignItems: 'center'}}>
          <Text>
            {list.map((l, i) => (
              <Text key={i}>{l}</Text>
            ))}{' '}
          </Text>
          <Text>Temperature: {this.state.temp}</Text>
          <Text>CO2: {this.state.co2}</Text>
        </View>
        <View style={{}}>
          <Text>{this.state.connected ? 'Connected' : 'Not connected'}</Text>
        </View>
      </View>
    );
  }
}
