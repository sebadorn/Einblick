'use strict';


var Einblick = {


	_doc: null,
	_docMeta: null,
	_page: null,
	_texts: null,

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
	 * Adjust the zoom so the current
	 * page fits to the window width.
	 */
	fitToWidth: function() {
		if( !Einblick._page ) {
			console.error( '[Einblick.fitToWidth] No page set.' );
			return;
		}

		var pw = Einblick._page.pageInfo.view[2];
		var areaWidth = $( '.canvas-wrap' ).width() - 16;
		var zoom = Math.round( areaWidth / pw * 100 ) / 100;

		Einblick.setZoom( zoom );
	},


	/**
	 * Initialize the application.
	 * @param {Function} cb Callback when done.
	 */
	init: function( cb ) {
		this._loadScripts( function() {
			Einblick.loadLanguage( function() {
				Einblick.UI.init( function() {
					PDFJS.workerSrc = 'js/pdf.worker.js';
					Einblick.loadFile( __dirname + '/../test.pdf' );

					cb && cb();
				} );
			} );
		} );
	},


	/**
	 * Load and open a PDF file.
	 * @param {String} p Path to the file.
	 */
	loadFile: function( p ) {
		var fs = require( 'fs' );

		fs.lstat( p, function( err, stat ) {
			if( err ) {
				console.error( err );
				return;
			}

			PDFJS.getDocument( p ).then( function( pdf ) {
				Einblick._doc = pdf;

				pdf.getMetadata().then( function( meta ) {
					Einblick._docMeta = meta;

					if( meta && meta.info ) {
						$( 'title' ).text( meta.info.Title );
					}
				} );

				Einblick.showPage( 1 );
			} );

			Einblick.UI.update( {
				filesize: stat.size
			} );
		} );
	},


	/**
	 * Load the language.
	 * @param {Function} cb Callback.
	 */
	loadLanguage: function( cb ) {
		var lang = localStorage.getItem( 'einblick.language' );

		if( !lang ) {
			lang = window.navigator.language;
		}

		lang = lang.substr( 0, 2 );
		var file = __dirname + '/lang/' + lang + '.json';

		var fs = require( 'fs' );
		fs.readFile( file, function( err, content ) {
			if( err ) {
				console.error( err );
				cb && cb( err );
				return;
			}

			var translations = {};

			try {
				translations = JSON.parse( String( content ) );
			}
			catch( err ) {
				console.error( err );
			}

			Einblick._texts = translations;

			cb && cb();
		} );
	},


	/**
	 * Show the next page.
	 */
	pageNext: function() {
		if( !this._page ) {
			return;
		}

		// pageIndex is zero-based.
		var curr = this._page.pageIndex;
		var next = Math.min( curr + 2, this._doc.numPages );
		this.showPage( next );
	},


	/**
	 * Show the previous page.
	 */
	pagePrevious: function() {
		if( !this._page ) {
			return;
		}

		// pageIndex is zero-based.
		var curr = this._page.pageIndex;
		var prev = Math.max( curr, 1 );
		this.showPage( prev );
	},


	/**
	 * Set the zoom.
	 * @param {Number} zoom Zoom. 1.0 => 100%.
	 */
	setZoom: function( zoom ) {
		if( !Einblick._page ) {
			console.error( '[Einblick.setZoom] Page no set.' );
			return;
		}

		var page = Einblick._page;

		var vp = page.getViewport( zoom );
		var c = Einblick.UI.canvas;
		c.width = vp.width;
		c.height = vp.height;

		Einblick.UI.update( {
			zoom: zoom
		} );

		page.render( {
			canvasContext: c.getContext( '2d' ),
			viewport: vp
		} );
	},


	/**
	 * Show a certain page.
	 * @param {Number}   index Page number. Starts at 1.
	 * @param {Function} cb    Callback.
	 */
	showPage: function( index, cb ) {
		if( !this._doc ) {
			console.error( '[Einblick.showPage] No document loaded.' );
			return;
		}

		// Clamp the page index.
		index = Math.max( 1, Math.min( this._doc.numPages, index ) );

		this._doc.getPage( index ).then( function( page ) {
			Einblick._page = page;
			Einblick.setZoom( 1.0 );

			Einblick.UI.update( {
				index: index,
				numPages: Einblick._doc.numPages
			} );

			cb && cb();
		} );
	},


	/**
	 * Get the text/translation for the given key.
	 * @param  {String} key Key to translate.
	 * @return {String}     Translation.
	 */
	t: function( key ) {
		return Einblick._texts[key] || key;
	}


};
