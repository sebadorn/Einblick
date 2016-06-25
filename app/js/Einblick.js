'use strict';


var Einblick = {


	currentPageIndex: null,
	doc: null,
	docMeta: null,
	pages: {},

	_intervalMemory: 0,
	_pageHistory: [],
	_scripts: [
		'UI.js'
	],
	_texts: null,


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
	 * Free some memory by unloading/cleaning old pages.
	 */
	autoUnloadPages: function() {
		var current = Einblick.currentPageIndex;
		var pPrev = 1;
		var trend = 0;
		var unloadThreshold = 3;
		var minPageDistance = 6;

		for( var i = 0; i < this._pageHistory.length; i++ ) {
			var p = this._pageHistory[i];

			if( i == 0 ) {
				pPrev = p;
				continue;
			}

			trend += ( p - pPrev );
			pPrev = p;
		}

		if( trend < unloadThreshold && trend > -unloadThreshold ) {
			return;
		}


		for( var pageIndex in Einblick.UI.canvases ) {
			var c = Einblick.UI.canvases[pageIndex];

			if( !c.loaded ) {
				continue;
			}

			// Moving down.
			if( trend >= unloadThreshold ) {
				// Unload earlier pages.
				if( current - pageIndex >= minPageDistance ) {
					this.pages[pageIndex].cleanup();
					delete this.pages[pageIndex];
					c.canvas.width = c.canvas.width;
					c.loaded = false;
				}
			}
			// Moving up.
			else if( trend <= -unloadThreshold ) {
				// Unload later pages.
				if( pageIndex - current >= minPageDistance ) {
					this.pages[pageIndex].cleanup();
					delete this.pages[pageIndex];
					c.canvas.width = c.canvas.width;
					c.loaded = false;
				}
			}
		}
	},


	/**
	 * Clear the old document to
	 * prepare for a new one.
	 */
	clear: function() {
		Einblick.UI.clear();

		if( this.doc ) {
			this.doc.cleanup();
		}

		this._pageHistory = [];
		this.currentPageIndex = null;
		this.doc = null;
		this.docMeta = null;
		this.pages = {};
	},


	/**
	 * Adjust the zoom so the current
	 * page fits to the window width.
	 */
	fitToWidth: function() {
		var page = Einblick.pages[Einblick.currentPageIndex];

		if( !page ) {
			console.error( '[Einblick.fitToWidth] No page set.' );
			return;
		}

		var $cw = document.querySelector( '.canvas-wrap' );
		var cwStyle = window.getComputedStyle( $cw );
		var cwWidth = Number( cwStyle.width.replace( 'px', '' ) );
		var areaWidth = cwWidth - 16;

		var pw = page.pageInfo.view[2];
		var zoom = Math.round( areaWidth / pw * 100 ) / 100;

		Einblick.setZoomAll( zoom );
		Einblick.UI.update( { zoom: zoom } );

		return zoom;
	},


	/**
	 * Initialize the application.
	 * @param {Function} cb Callback when done.
	 */
	init: function( cb ) {
		this._loadScripts( function() {
			Einblick.loadLanguage( function() {
				Einblick.showMemoryUsage();
				clearInterval( Einblick._intervalMemory );

				Einblick._intervalMemory = setInterval( function() {
					Einblick.showMemoryUsage();
				}, 4000 );

				Einblick.UI.init( function() {
					PDFJS.workerSrc = 'js/pdf.worker.js';

					var argv = electron.remote.getGlobal( 'argv' );

					if( argv['--open'] && argv['--open'].length > 0 ) {
						Einblick.loadFile( argv['--open'] );
					}
					else {
						Einblick.loadFile( __dirname + '/../test.pdf' );
					}

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

			Einblick.clear();

			PDFJS.getDocument( p ).then( function( pdf ) {
				Einblick.doc = pdf;

				pdf.getMetadata().then( function( meta ) {
					Einblick.docMeta = meta;

					if( meta && meta.info ) {
						var $title = document.querySelector( 'title' );
						$title.textContent = meta.info.Title;
					}
				} );

				Einblick.UI.initPages( function() {
					Einblick.UI.update( {
						numPages: pdf.numPages
					} );
					Einblick.showPage( 1 );
				} );
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
		if( !Einblick.currentPageIndex ) {
			return;
		}

		var curr = Einblick.currentPageIndex;
		var next = Math.min( curr + 1, Einblick.doc.numPages );
		Einblick.showPage( next );
		Einblick.UI.scrollToPage( next );

		if( Einblick.UI.mode === Einblick.UI.PAGE_MODE.SINGLE ) {
			Einblick.UI.hideAllCanvases();

			var $p = document.querySelector( '#pdf-page-' + next );
			$p.style.display = '';
		}
	},


	/**
	 * Show the previous page.
	 */
	pagePrevious: function() {
		if( !Einblick.currentPageIndex ) {
			return;
		}

		// pageIndex is zero-based.
		var curr = Einblick.currentPageIndex;
		var prev = Math.max( curr - 1, 1 );
		Einblick.showPage( prev );
		Einblick.UI.scrollToPage( prev );

		if( Einblick.UI.mode === Einblick.UI.PAGE_MODE.SINGLE ) {
			Einblick.UI.hideAllCanvases();

			var $p = document.querySelector( '#pdf-page-' + prev );
			$p.style.display = '';
		}
	},


	/**
	 * Set the zoom.
	 * @param  {Number} zoom      Zoom. 1.0 => 100%.
	 * @param  {Number} pageIndex The page index.
	 * @return {Object}           Viewport.
	 */
	setZoom: function( zoom, pageIndex ) {
		if( !pageIndex ) {
			pageIndex = Einblick.currentPageIndex;
		}

		if( !Einblick.pages[pageIndex] ) {
			console.error( '[Einblick.setZoom] Page not set.' );
			return;
		}

		var page = Einblick.pages[pageIndex];
		var vp = page.getViewport( zoom );
		var cData = Einblick.UI.canvases[pageIndex];

		if( !cData ) {
			console.error( '[Einblick.setZoom] No canvas for page.' );
			return;
		}

		var c = cData.canvas;
		cData.loaded = true;

		c.width = vp.width;
		c.height = vp.height;
		c.style.width = c.width + 'px';
		c.style.height = c.height + 'px';

		page.render( {
			canvasContext: c.getContext( '2d' ),
			viewport: vp
		} );

		return vp;
	},


	/**
	 * Update the zoom for all pages.
	 * @param {Number} zoom New zoom value.
	 */
	setZoomAll: function( zoom ) {
		var vp = null;

		for( var index in Einblick.pages ) {
			var cData = Einblick.UI.canvases[index];

			if( !cData ) {
				continue;
			}

			var page = Einblick.pages[index];

			if( !page ) {
				continue;
			}

			vp = page.getViewport( zoom );
			var c = cData.canvas;
			c.width = vp.width;
			c.height = vp.height;
			c.style.width = c.width + 'px';
			c.style.height = c.height + 'px';

			page.render( {
				canvasContext: c.getContext( '2d' ),
				viewport: vp
			} );
		}

		if( vp ) {
			Einblick.UI.update( {
				pageWidth: vp.width,
				pageHeight: vp.height
			} );
		}
	},


	/**
	 * Check the memory usage and display it in the UI.
	 */
	showMemoryUsage: function() {
		var inRAM = process.memoryUsage().rss;
		Einblick.UI.update( { memory: inRAM } );
	},


	/**
	 * Show a certain page.
	 * @param  {Number}   index Page number. Starts at 1.
	 * @param  {Function} cb    Callback.
	 * @return {Number}         The current page index.
	 */
	showPage: function( index, cb ) {
		if( !this.doc ) {
			console.error( '[Einblick.showPage] No document loaded.' );
			return;
		}

		// Clamp the page index.
		index = Math.max( 1, Math.min( this.doc.numPages, index ) );

		var phLen = this._pageHistory.length;

		if( this._pageHistory[phLen - 1] != index ) {
			this._pageHistory.push( index );

			if( phLen > 10 ) {
				this._pageHistory.splice( 0, phLen - 10 );
			}
		}

		Einblick.autoUnloadPages();

		var UI = Einblick.UI;
		var cData = UI.canvases[index];

		if( !cData || !cData.loaded ) {
			this.doc.getPage( index ).then( function( page ) {
				var index = page.pageIndex + 1;
				Einblick.pages[index] = page;
				Einblick.currentPageIndex = index;

				var viewport = Einblick.setZoom( UI.zoom, index );

				if( viewport ) {
					UI.update( {
						index: index,
						pageHeight: viewport.height,
						pageWidth: viewport.width,
						zoom: UI.zoom
					} );
				}

				cb && cb();
			} );
		}
		else {
			Einblick.currentPageIndex = index;
			UI.update( { index: index } );

			cb && cb();
		}


		// Preload some of the previous page.
		for( var i = 1; i <= 2; i++ ) {
			var indexPrev = index - i;

			if( indexPrev < 1 ) {
				break;
			}

			var cData = UI.canvases[indexPrev];

			if( cData && cData.loaded ) {
				continue;
			}

			this.doc.getPage( indexPrev ).then( function( page ) {
				var indexPrev = page.pageIndex + 1;
				Einblick.pages[indexPrev] = page;
				Einblick.setZoom( UI.zoom, indexPrev );
			} );
		}


		// Preload some of the next pages.
		for( var i = 1; i <= 3; i++ ) {
			var indexNext = index + i;

			if( indexNext > this.doc.numPages ) {
				break;
			}

			var cData = UI.canvases[indexNext];

			if( cData && cData.loaded ) {
				continue;
			}

			this.doc.getPage( indexNext ).then( function( page ) {
				var indexNext = page.pageIndex + 1;
				Einblick.pages[indexNext] = page;
				Einblick.setZoom( UI.zoom, indexNext );
			} );
		}


		return index;
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
