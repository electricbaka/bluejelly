/*
============================================================
BlueJelly.js
============================================================
Web Bluetooth API Wrapper Library

Copyright 2017-2020 JellyWare Inc.
https://jellyware.jp/

GitHub
https://github.com/electricbaka/bluejelly
This software is released under the MIT License.

Web Bluetooth API
https://webbluetoothcg.github.io/web-bluetooth/
*/

//--------------------------------------------------
//BlueJelly constructor
//--------------------------------------------------
var BlueJelly = function(){
  this.bluetoothDevice = null;
  this.dataCharacteristic = null;
  this.hashUUID ={};
  this.hashUUID_lastConnected;

  //callBack
  this.onScan = function(deviceName){console.log("onScan");};
  this.onConnectGATT = function(uuid){console.log("onConnectGATT");};
  this.onRead = function(data, uuid){console.log("onRead");};
  this.onWrite = function(uuid){console.log("onWrite");};
  this.onStartNotify = function(uuid){console.log("onStartNotify");};
  this.onStopNotify = function(uuid){console.log("onStopNotify");};
  this.onDisconnect = function(){console.log("onDisconnect");};
  this.onClear = function(){console.log("onClear");};
  this.onReset = function(){console.log("onReset");};
  this.onError = function(error){console.log("onError");};
}


//--------------------------------------------------
//setUUID
//--------------------------------------------------
BlueJelly.prototype.setUUID = function(name, serviceUUID, characteristicUUID){
  console.log('Execute : setUUID');
  console.log(this.hashUUID);

  this.hashUUID[name] = {'serviceUUID':serviceUUID, 'characteristicUUID':characteristicUUID};
}


//--------------------------------------------------
//scan
//--------------------------------------------------
BlueJelly.prototype.scan = function(uuid){
  return (this.bluetoothDevice ? Promise.resolve() : this.requestDevice(uuid))
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//requestDevice
//--------------------------------------------------
BlueJelly.prototype.requestDevice = function(uuid) {
  console.log('Execute : requestDevice');
  return navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [this.hashUUID[uuid].serviceUUID]})
  .then(device => {
    this.bluetoothDevice = device;
    this.bluetoothDevice.addEventListener('gattserverdisconnected', this.onDisconnect);
    this.onScan(this.bluetoothDevice.name);
  });
}


//--------------------------------------------------
//connectGATT
//--------------------------------------------------
BlueJelly.prototype.connectGATT = function(uuid) {
  if(!this.bluetoothDevice)
  {
    var error = "No Bluetooth Device";
    console.log('Error : ' + error);
    this.onError(error);
    return;
  }
  if (this.bluetoothDevice.gatt.connected && this.dataCharacteristic) {
    if(this.hashUUID_lastConnected == uuid)
      return Promise.resolve();
  }
  this.hashUUID_lastConnected = uuid;

  console.log('Execute : connect');
  return this.bluetoothDevice.gatt.connect()
  .then(server => {
    console.log('Execute : getPrimaryService');
    return server.getPrimaryService(this.hashUUID[uuid].serviceUUID);
  })
  .then(service => {
    console.log('Execute : getCharacteristic');
    return service.getCharacteristic(this.hashUUID[uuid].characteristicUUID);
  })
  .then(characteristic => {
    this.dataCharacteristic = characteristic;
    this.dataCharacteristic.addEventListener('characteristicvaluechanged',this.dataChanged(this, uuid));
    this.onConnectGATT(uuid);
  })
  .catch(error => {
      console.log('Error : ' + error);
      this.onError(error);
    });
}


//--------------------------------------------------
//dataChanged
//--------------------------------------------------
BlueJelly.prototype.dataChanged = function(self, uuid) {
  return function(event) {
    self.onRead(event.target.value, uuid);
  }
}


//--------------------------------------------------
//read
//--------------------------------------------------
BlueJelly.prototype.read= function(uuid) {
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
    console.log('Execute : readValue');
    return this.dataCharacteristic.readValue();
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//write
//--------------------------------------------------
BlueJelly.prototype.write = function(uuid, array_value) {
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
    console.log('Execute : writeValue');
    data = Uint8Array.from(array_value);
    return this.dataCharacteristic.writeValue(data);
  })
  .then( () => {
    this.onWrite(uuid);
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//startNotify
//--------------------------------------------------
BlueJelly.prototype.startNotify = function(uuid) {
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
    console.log('Execute : startNotifications');
    this.dataCharacteristic.startNotifications()
  })
  .then( () => {
    this.onStartNotify(uuid);
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//stopNotify
//--------------------------------------------------
BlueJelly.prototype.stopNotify = function(uuid){
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
  console.log('Execute : stopNotifications');
  this.dataCharacteristic.stopNotifications()
})
  .then( () => {
    this.onStopNotify(uuid);
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//disconnect
//--------------------------------------------------
BlueJelly.prototype.disconnect= function() {
  if (!this.bluetoothDevice) {
    var error = "No Bluetooth Device";
    console.log('Error : ' + error);
    this.onError(error);
    return;
  }

  if (this.bluetoothDevice.gatt.connected) {
    console.log('Execute : disconnect');
    this.bluetoothDevice.gatt.disconnect();
  } else {
   var error = "Bluetooth Device is already disconnected";
   console.log('Error : ' + error);
   this.onError(error);
   return;
  }
}


//--------------------------------------------------
//clear
//--------------------------------------------------
BlueJelly.prototype.clear= function() {
   console.log('Excute : Clear Device and Characteristic');
   this.bluetoothDevice = null;
   this.dataCharacteristic = null;
   this.onClear();
}


//--------------------------------------------------
//reset(disconnect & clear)
//--------------------------------------------------
BlueJelly.prototype.reset= function() {
  console.log('Excute : reset');
  this.disconnect(); //disconnect() is not Promise Object
  this.clear();
  this.onReset();
}


//--------------------------------------------------
//micro:bit UUID(class constant)
//--------------------------------------------------
Object.defineProperty(BlueJelly, 'MICROBIT_BASE_UUID', {value: "e95d0000-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_SERVICESGENERIC_ACCESS', {value: "00001800-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_DEVICE_NAME', {value: "00002a00-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_APPEARANCE', {value: "00002a01-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_PERIPHERAL_PREFERRED_CONNECTION_PARAMETERS', {value: "00002a04-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_GENERIC_ATTRIBUTE', {value: "00001801-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_SERVICE_CHANGED', {value: "2a05", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_DEVICE_INFORMATION', {value: "0000180a-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_MODEL_NUMBER_STRING', {value: "00002a24-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_SERIAL_NUMBER_STRING', {value: "00002a25-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_HARDWARE_REVISION_STRING', {value: "00002a27-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_FIRMWARE_REVISION_STRING', {value: "00002a26-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_MANUFACTURER_NAME_STRING', {value: "00002a29-0000-1000-8000-00805f9b34fb", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_ACCELEROMETER_SERVICE', {value: "e95d0753-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_ACCELEROMETER_DATA', {value: "e95dca4b-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_ACCELEROMETER_PERIOD', {value: "e95dfb24-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_MAGNETOMETER_SERVICE', {value: "e95df2d8-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_MAGNETOMETER_DATA', {value: "e95dfb11-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_MAGNETOMETER_PERIOD', {value: "e95d386c-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_MAGNETOMETER_BEARING', {value: "e95d9715-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_MAGNETOMETER_CALIBRATION', {value: "e95db358-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_BUTTON_SERVICE', {value: "e95d9882-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_BUTTON_A_STATE', {value: "e95dda90-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_BUTTON_B_STATE', {value: "e95dda91-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_IO_PIN_SERVICE', {value: "e95d127b-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_PIN_DATA', {value: "e95d8d00-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_PIN_AD_CONFIGURATION', {value: "e95d5899-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_PIN_IO_CONFIGURATION', {value: "e95db9fe-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_PWM_CONTROL', {value: "e95dd822-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_LED_SERVICE', {value: "e95dd91d-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_LED_MATRIX_STATE', {value: "e95d7b77-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_LED_TEXT', {value: "e95d93ee-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_SCROLLING_DELAY', {value: "e95d0d2d-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_EVENT_SERVICE', {value: "e95d93af-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_MICROBIT_REQUIREMENTS', {value: "e95db84c-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_MICROBIT_EVENT', {value: "e95d9775-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_CLIENT_REQUIREMENTS', {value: "e95d23c4-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_CLIENT_EVENT', {value: "e95d5404-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_DFU_CONTROL_SERVICE', {value: "e95d93b0-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_DFU_CONTROL', {value: "e95d93b1-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_TEMPERATURE_SERVICE', {value: "e95d6100-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_TEMPERATURE', {value: "e95d9250-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_TEMPERATURE_PERIOD', {value: "e95d1b25-251d-470a-a062-fa1922dfa9a8", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_UART_SERVICE', {value: "6e400001-b5a3-f393-e0a9-e50e24dcca9e", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_TX_CHARACTERISTIC', {value: "6e400002-b5a3-f393-e0a9-e50e24dcca9e", writable: false});
Object.defineProperty(BlueJelly, 'MICROBIT_RX_CHARACTERISTIC', {value: "6e400003-b5a3-f393-e0a9-e50e24dcca9e", writable: false});
