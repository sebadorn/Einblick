'use strict';


const electron = require( 'electron' );
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

var mainWindow = null;


app.on( 'window-all-closed', function() {
	if( process.platform != 'darwin' ) {
		app.quit();
	}
} );


app.on( 'ready', function() {
	global.argv = {};

	var prevArg = null;

	for( var i = 0; i < process.argv.length; i++ ) {
		var arg = process.argv[i];

		if( arg === '-i' ) {
			prevArg = arg;
			continue;
		}

		if( prevArg === '-i' ) {
			global.argv[prevArg] = arg;
		}

		prevArg = null;
	}

	mainWindow = new BrowserWindow( {
		autoHideMenuBar: true,
		backgroundColor: '#000000',
		enableLargerThanScreen: true,
		icon: __dirname + '/images/logo.png',
		resizable: true,
		show: true,

		webPreferences: {
			plugins: false,
			webaudio: true,
			webgl: true
		}
	} );

	mainWindow.loadURL( 'file://' + __dirname + '/index.html' );

	mainWindow.on( 'closed', function() {
		mainWindow = null;
	} );
} );
