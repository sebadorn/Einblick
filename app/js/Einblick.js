'use strict';


var Einblick = {


	currentPageIndex: null,
	doc: null,
	docMeta: null,
	pages: {},
	pageTexts: {},
	toc: {},

	_intervalMemory: 0,
	_pageHistory: [],
	_scripts: [
		'Search.js',
		'UI.js'
	],
	_texts: null,


	/**
	 * Callback after loading table of contents data.
	 * @param {Array<Object>|null} outline
	 * @param {Array<String>|null} labels
	 */
	_cbLoadDataTOC: function( outline, labels ) {
		Einblick.buildTOC( Einblick.toc, outline, labels, function() {
			Einblick.UI.buildContentList();
		} );
	},


	/**
	 * Callback after loading page texts.
	 */
	_cbLoadPageTexts: function() {
		Einblick.Search.buildSearchStructure(
			Einblick.pageTexts
		);

		Einblick.UI.initPages( function() {
			Einblick.UI.update( {
				numPages: Einblick.doc.numPages
			} );

			Einblick.showPage( 1 );
		} );
	},


	/**
	 * Callback after loading meta data.
	 * @param {Object} meta Meta data.
	 */
	_cbMetaData: function( meta ) {
		Einblick.docMeta = meta;

		if( meta && meta.info ) {
			var title = document.querySelector( 'title' );
			title.textContent = meta.info.Title;
		}
	},


	/**
	 * Callback on error in meta data loading.
	 * @param {Error} err
	 */
	_cbMetaDataError: function( err ) {
		console.error( '[Einblick._cbMetaDataError] ' + err.message );
	},


	/**
	 * Load the data for the TOC.
	 * @param {Function} cb Callback.
	 */
	_loadDataForTOC: function( cb ) {
		Einblick.toc = {};
		var promise = Einblick.doc.getOutline();

		promise.then( function( outline ) {
			Einblick.doc.getPageLabels().then( function( labels ) {
				cb && cb( outline, labels );
			} );
		} );
	},


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

			if( i === 0 ) {
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
			// Moving down.
			if( trend >= unloadThreshold ) {
				// Unload earlier pages.
				if( current - pageIndex >= minPageDistance ) {
					this.unloadPage( pageIndex );
				}
			}
			// Moving up.
			else if( trend <= -unloadThreshold ) {
				// Unload later pages.
				if( pageIndex - current >= minPageDistance ) {
					this.unloadPage( pageIndex );
				}
			}
		}
	},


	/**
	 * Build the table of contents structure,
	 * associating the destinations from the outline
	 * with actual page indices.
	 * @param {Object}        parent
	 * @param {Array<Object>} outline
	 * @param {Array<String>} labels
	 * @param {Function}      cb Callback.
	 */
	buildTOC: function( parent, outline, labels, cb ) {
		if( !this.doc ) {
			cb && cb();
			return;
		}

		labels = labels || [];

		var fnGetNext = function( outline, i ) {
			if( !outline || i >= outline.length ) {
				cb && cb();
				return;
			}

			var o = outline[i];
			var destPromise = Einblick.doc.getDestination( o.dest );

			destPromise.then( function( dest ) {
				if( !dest || !dest[0] ) {
					fnGetNext( outline, i + 1 );
					return;
				}

				var indexPromise = Einblick.doc.getPageIndex( dest[0] );

				indexPromise.then( function( index ) {
					// Index is given zero-based,
					// but we use them 1-based.
					index++;

					parent[o.dest] = {
						pageIndex: index,
						title: o.title,
						label: labels[index - 1]
					};

					if( o.items && o.items.length > 0 ) {
						parent[o.dest].items = {};
						var items = parent[o.dest].items;
						var cbNext = function() {
							fnGetNext( outline, i + 1 );
						};

						Einblick.buildTOC( items, o.items, labels, cbNext );
					}
					else {
						fnGetNext( outline, i + 1 );
					}
				} );
			} );
		};

		fnGetNext( outline, 0 );
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
		this.toc = {};
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

		var cw = document.querySelector( '.canvas-wrap' );
		var cwStyle = window.getComputedStyle( cw );
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
			PDFJS.workerSrc = 'js/pdf.worker.js';

			Einblick.loadLanguage( function() {
				Einblick.showMemoryUsage();
				clearInterval( Einblick._intervalMemory );

				Einblick._intervalMemory = setInterval( function() {
					Einblick.showMemoryUsage();
				}, 4000 );

				Einblick.UI.init( function() {
					var argv = electron.remote.getGlobal( 'argv' );
					var filePath = argv['-i'];

					if( filePath && filePath.length > 0 ) {
						Einblick.loadFile( filePath );
					}

					cb && cb();
				} );
			} );
		} );
	},


	/**
	 * Open a file.
	 * @param {String} fp Path to the file.
	 */
	loadFile: function( fp ) {
		var fs = require( 'fs' );
		var path = require( 'path' );

		if( !path.isAbsolute( fp ) ) {
			var cwd = process.cwd();
			fp = path.join( cwd, fp );
		}

		fs.lstat( fp, function( err, stat ) {
			if( err ) {
				console.error( err );
				return;
			}

			Einblick.clear();
			Einblick.UI.update( {
				filesize: stat.size
			} );

			Einblick.loadPDF( fp );
		} );
	},


	/**
	 * Load all the page texts.
	 * @param {Function} cb Callback.
	 */
	loadPageTexts: function( cb ) {
		Einblick.pageTexts = {};

		var loadNext = function( i ) {
			if( i > Einblick.doc.numPages ) {
				cb && cb();
				return;
			}

			Einblick.doc.getPage( i ).then(
				function( page ) {
					page.getTextContent().then(
						function( tc ) {
							var index = page.pageIndex + 1;
							Einblick.pageTexts[index] = tc;

							loadNext( i + 1 );
						},

						function( err ) {
							console.error( '[Einblick._cbGetPage] ' + err.message );
						}
					);
				},

				function( err ) {
					console.error( '[Einblick._cbGetPageError] ' + err.message );
				}
			);
		};

		loadNext( 1 );
	},


	/**
	 * Load a PDF file.
	 * @param {String} fp File path.
	 */
	loadPDF: function( fp ) {
		var pdfLoaded = function( pdf ) {
			this.doc = pdf;
			this.doc.getMetadata().then(
				this._cbMetaData,
				this._cbMetaDataError
			);
			this.loadPageTexts( this._cbLoadPageTexts );
			this._loadDataForTOC( this._cbLoadDataTOC );
		}.bind( this );

		var pdfError = function( err ) {
			console.error( '[Einblick.loadFile] ' + err.message );
		};

		PDFJS.getDocument( fp ).then( pdfLoaded, pdfError );
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

			var p = document.querySelector( '#pdf-page-' + next );
			p.style.display = '';
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

			var p = document.querySelector( '#pdf-page-' + prev );
			p.style.display = '';
		}
	},


	/**
	 * Render the text layer.
	 * @param {Number} index Page index.
	 */
	renderTextLayer: function( index ) {
		var c = Einblick.UI.canvases[index];
		var pt = Einblick.pageTexts[index];
		var page = Einblick.pages[index];

		if( !c || !pt || !page || c.text ) {
			return;
		}

		c.text = document.createElement( 'div' );
		c.text.className = 'page-text';
		c.page.appendChild( c.text );

		PDFJS.renderTextLayer( {
			textContent: pt,
			container: c.text,
			viewport: page.getViewport( 1 ),
			textDivs: []
		} );
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

		cData.page.style.width = c.style.width;
		cData.page.style.height = c.style.height;

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

			cData.page.style.width = c.style.width;
			cData.page.style.height = c.style.height;

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

				Einblick.renderTextLayer( index );
				Einblick.Search.highlightMatches( index );

				cb && cb();
			} );
		}
		else {
			Einblick.currentPageIndex = index;
			UI.update( { index: index } );
			Einblick.Search.highlightMatches( index );

			cb && cb();
		}


		// Preload some of the previous page.
		for( var i = 1; i <= 2; i++ ) {
			var indexPrev = index - i;

			if( indexPrev < 1 ) {
				break;
			}

			var cDataPrev = UI.canvases[indexPrev];

			if( cDataPrev && cDataPrev.loaded ) {
				continue;
			}

			this.doc.getPage( indexPrev ).then( function( page ) {
				var indexPrev = page.pageIndex + 1;
				Einblick.pages[indexPrev] = page;
				Einblick.setZoom( UI.zoom, indexPrev );
				Einblick.renderTextLayer( indexPrev );
			} );
		}


		// Preload some of the next pages.
		for( var i = 1; i <= 3; i++ ) {
			var indexNext = index + i;

			if( indexNext > this.doc.numPages ) {
				break;
			}

			var cDataNext = UI.canvases[indexNext];

			if( cDataNext && cDataNext.loaded ) {
				continue;
			}

			this.doc.getPage( indexNext ).then( function( page ) {
				var indexNext = page.pageIndex + 1;
				Einblick.pages[indexNext] = page;
				Einblick.setZoom( UI.zoom, indexNext );
				Einblick.renderTextLayer( indexNext );
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
	},


	/**
	 * Unload a page.
	 * @param {Number} index Page index.
	 */
	unloadPage: function( index ) {
		var c = Einblick.UI.canvases[index];

		if( !c || !this.pages[index] ) {
			return;
		}

		this.pages[index].cleanup();
		delete this.pages[index];

		var newCanvas = document.createElement( 'canvas' );
		newCanvas.style = c.canvas.style;
		newCanvas.width = c.canvas.width;
		newCanvas.height = c.canvas.height;
		c.page.replaceChild( newCanvas, c.canvas );

		c.canvas = newCanvas;
		c.loaded = false;
	}


};
