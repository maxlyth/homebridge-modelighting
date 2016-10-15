// Homebridge Plugin for Mode Lighting System using Remote Control Interface
// Need to enhance with more error checking

var Service, Characteristic;

module.exports = function (homebridge) {

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-modelighting", "modelighting", ModeLightingAccessory);
}

function ModeLightingAccessory (log, config) {
    this.log = log;

    // Get Room Name from config.json
    this.name = config["name"];

    // Get Mode Lighting On/Off Scene Numbers for Room Name and NPU IP Address from config.json
    this.on_scene = config["on_scene"];
    this.off_scene = config["off_scene"];
    this.NPU_IP = config["NPU_IP"];
}

ModeLightingAccessory.prototype = {

    sceneRequest: function (scene, NPU_IP) {
        
        var telnet = require('telnet-client');

        var connection = new telnet();

        var params = {
            host: this.NPU_IP,
            port: 22,
            shellPrompt: 'EVORDY',
            timeout: 1000,
            negotiationMandatory: false
        };

        // Callback handler for close event, though have never seen this for NPU
        connection.on('error', function () {
            console.log('Error in connecting');
        });

        // Callback handler for close event
        connection.on('close', function () {
            console.log('Connection to Mode NPU closed');
            return -1;
        });

        // Callback handler for timeout event, though have never seen this for NPU
        connection.on('timeout', function () {
            console.log('Connection to Mode NPU timed out!');
        });

        // Callback handler for ready event, though have never seen this for NPU
        connection.on('ready', function () {
            console.log('Connection to Mode NPU is ready to receive data');
        });

        // Callback handler for connect event.  As Mode NPU Remote Control
        // does not have a login/password then this event is used to trigger
        // sending data on the connection.

        connection.on('connect', function () {

            scene = 'SCENE' + scene + 'GO';

            console.log('Connected to Mode NPU and about to send ' + scene);

            connection.send(scene);

            // Close connection immediately after sending data
            connection.end();

        });

        // Connect to Mode NPU Remote Control Port
        this.log ("Connecting to Mode NPU at IP address " + NPU_IP + "with scene: " + scene);
        connection.connect(params);
    },

    setPowerState: function (powerOn, callback) {

        var scene;

        var NPU_IP=this.NPU_IP;

        if (powerOn) {
            scene = this.on_scene;
            this.log("Invoking on scene");
        } else {
            scene = this.off_scene;
            this.log("Invoking off scene");
        }

        this.sceneRequest(scene, NPU_IP, function (error) {
            if (error) {
                this.log('Scene function failed!');
                callback(error);
            } else {
                this.log('Scene function succeeded!');
                callback();
            }
        }.bind(this));
    },

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {

        // you can OPTIONALLY create an information service if you wish to override
        // the default values for things like serial number, model, etc.
        var informationService = new Service.AccessoryInformation();

        informationService
			.setCharacteristic(Characteristic.Manufacturer, "Mode Lighting")
			.setCharacteristic(Characteristic.Model, "NPU 1.3.0.99")
			.setCharacteristic(Characteristic.SerialNumber, "");

        var switchService = new Service.Switch(this.name);

        switchService
			.getCharacteristic(Characteristic.On)
			.on('set', this.setPowerState.bind(this));

        return [switchService];
    }
};