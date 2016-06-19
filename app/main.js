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

	for( var i = 0; i < process.argv.length; i++ ) {
		var parts = process.argv[i].split( '=' );

		if( parts.length >= 2 ) {
			global.argv[parts[0]] = parts[1];
		}
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

	if( !electron.globalShortcut.isRegistered( 'F12' ) ) {
		electron.globalShortcut.register( 'F12', function() {
			mainWindow.toggleDevTools();
		} );
	}
} );
