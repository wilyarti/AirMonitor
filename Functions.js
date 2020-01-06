import {PermissionsAndroid, ToastAndroid} from 'react-native';
import {Buffer} from 'buffer';
import moment from 'moment';
import {
  airMonitorServiceUUID,
  co2CharacteristicUUID,
  tempCharacteristicUUID,
  graphCharacteristicUUID,
} from './Constants';

export function scanAndConnect() {
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
          .then(() => {
            console.log('Discovering services and characteristics');
            return device.discoverAllServicesAndCharacteristics();
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
          .then(() => {
            console.log('Setting notifications');
            this.setState({deviceID: device.id, connected: true});
            return this.setupNotifications(device);
          })
          .finally(() => {
            this.setState({isLoading: false});
          });
      }
    },
  );
}
export async function requestBlePermission() {
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
export async function setupNotifications(device) {
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
    graphCharacteristicUUID,
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
        let jsonData = JSON.parse(converted);
        let nowMs = jsonData[2].timenow;
        let data = this.state.data;
        console.log(jsonData);
        if (jsonData[2].sequenceID === 65536) {
          //console.log(this.state.data);
          //this.processGraph(); ? Animate?
        }
        if (jsonData[2].dataID != this.state.dataID) {
          return;
        }
        // reset if we have received all the data before
        if (jsonData[2].sequenceID == 0) {
          data = [];
        }
        // setup our labels
        for (let i = 0; i < jsonData[2].count; i++) {
          let newMoment = new moment().subtract(nowMs - jsonData[1][i]);
          let color = getColor(jsonData[0][i]);
          let point = {x: newMoment, y: jsonData[0][i], fill: color};
          data.push(point);
        }
        this.setState({data});
      } catch (error) {
        console.log('Error passing JSON');
        console.log(error);
      }
    },
  );
}
export function getColor(value) {
  value = parseInt(value);
  if (value <= 500) {
    return 'blue';
  } else if (value <= 1000) {
    return 'green';
  } else if (value <= 1500) {
    return 'yellow';
  } else if (value <= 2000) {
    return 'orange';
  } else if (value <= 2500) {
    return 'red';
  } else if (value <= 5000) {
    return 'purple';
  } else {
    return 'pink';
  }
}
export function handleConnectButton() {
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

export function processGraph() {
  let chartData = this.state.chartData;
  let labels = this.state.labels;
  chartData.labels = [];
  let labelCounter = 0;
  let numLabels = 7;
  let step = Math.round(labels.length / numLabels);
  for (let i = 0; i < labels.length; i++) {
    labelCounter++;
    if (step == labelCounter) {
      chartData.labels.push(labels[i]);
      labelCounter = 0;
    } else {
      chartData.labels.push('');
    }
  }
  this.setState({chartData});
}
