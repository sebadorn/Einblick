'use strict';


var Einblick = {


	_scripts: [
		'UI.js'
	],


	/**
	 * Load the required scripts.
	 * @param {Function} cb Callback when done loading.
	 */
	_loadScripts: function( cb ) {
		if( this._scripts.length === 0 ) {
			cb();
			return;
		}

		var sName = this._scripts.splice( 0, 1 )[0];
		var sTag = document.createElement( 'script' );

		sTag.onload = function( ev ) {
			this._loadScripts( cb );
		}.bind( this );

		sTag.onerror = function( ev ) {
			console.error( '[Einblick._loadScripts] Failed to load: ' + ev.target.src );
		};

		sTag.src = 'js/' + sName;

		document.head.appendChild( sTag );
	},


	/**
	 * Initialize the application.
	 * @param {Function} cb Callback when done.
	 */
	init: function( cb ) {
		this._loadScripts( function() {
			Einblick.UI.init( function() {
				PDFJS.workerSrc = 'js/pdf.worker.js';
				Einblick.loadFile( '../test.pdf' );

				cb && cb();
			} );
		} );
	},


	/**
	 * Load and open a PDF file.
	 * @param {String} p Path to the file.
	 */
	loadFile: function( p ) {
		PDFJS.getDocument( p ).then( function( pdf ) {
			pdf.getPage( 1 ).then( function( page ) {
				var viewport = page.getViewport( 1.0 );
				Einblick.UI.canvas.width = viewport.width;
				Einblick.UI.canvas.height = viewport.height;
				var ctx = Einblick.UI.canvas.getContext( '2d' );
				var renderContext = {
					canvasContext: ctx,
					viewport: viewport
				};
				page.render( renderContext );
			} );
		} );
	}


};
