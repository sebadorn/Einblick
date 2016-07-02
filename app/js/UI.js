'use strict';


Einblick.UI = {


	PAGE_MODE: {
		CONTINUOUS: 'continous',
		SINGLE: 'single'
	},

	canvases: {},
	mode: null,
	zoom: 1.0,

	_timeoutLoadPage: 0,


	/**
	 * Build the list items and sublists
	 * for the sidebar content list.
	 * @param {Object}      o     Item data.
	 * @param {HTMLElement} $list Parent list to append the items to.
	 */
	_buildContentItem: function( o, $list ) {
		if( !o ) {
			return;
		}

		var $title = document.createElement( 'span' );
		$title.textContent = o.title;

		var $item = document.createElement( 'li' );
		$item.appendChild( $title );

		if( o.items && o.items.length > 0 ) {
			var $sublist = document.createElement( 'ol' );

			for( var i = 0; i < o.items.length; i++ ) {
				Einblick.UI._buildContentItem( o.items[i], $sublist );
			}

			$item.appendChild( $sublist );
		}

		$list.appendChild( $item );
	},


	/**
	 * Handle a general click event and
	 * close all opened submenus and the like.
	 * @param {MouseEvent} ev
	 */
	_closeAll: function( ev ) {
		var t = ev.target;
		var $laz = document.querySelector( '.layout-and-zoom' );

		if( !$laz.contains( t ) ) {
			var $zo = document.querySelector( '.zoom-options' );
			$zo.style.display = 'none';
		}
	},


	/**
	 * Handle the open file trigger.
	 * @param {Event} ev
	 */
	_handleOpenFile: function( ev ) {
		var $file = document.createElement( 'input' );
		$file.type = 'file';

		$file.addEventListener( 'change', function( evFile ) {
			if( evFile.target.files.length > 0 ) {
				var p = evFile.target.files[0].path;
				Einblick.loadFile( p );
			}
		} );

		var event = new MouseEvent( 'click' );
		$file.dispatchEvent( event );
	},


	/**
	 * Handle the page index input events.
	 * @param {KeyEvent} ev
	 */
	_handlePageIndex: function( ev ) {
		if( ev.keyCode != 13 ) {
			return;
		}

		var $input = ev.target;
		var index = Number( $input.value );

		if( isNaN( index ) ) {
			return;
		}

		index = Einblick.showPage( index, function() {
			$input.focus();
			$input.select();
		} );
		this.scrollToPage( index );

		if( this.mode === this.PAGE_MODE.SINGLE ) {
			this.hideAllCanvases();

			var $p = document.querySelector( '#pdf-page-' + index );
			$p.style.display = '';
		}
	},


	/**
	 * Handle the scroll event on the pages container.
	 * @param {ScrollEvent} ev
	 */
	_handlePageScroll: function( ev ) {
		clearTimeout( this._timeoutLoadPage );

		if( this.mode === this.PAGE_MODE.SINGLE ) {
			return;
		}

		this._timeoutLoadPage = setTimeout( function() {
			var $p = document.querySelector( '#pdf-page-1' );
			var pStyle = window.getComputedStyle( $p );
			var pageHeight = Number( pStyle.height.replace( 'px', '' ) );

			var scrollTop = ev.target.scrollTop;
			var segment = pageHeight + 4;
			var pageIndex = ~~( scrollTop / segment ) + 1;

			Einblick.currentPageIndex = pageIndex;
			Einblick.showPage( pageIndex );
			Einblick.UI.update( { index: pageIndex } );
		}, 50 );
	},


	/**
	 * Handle the zoom input events.
	 * @param {KeyEvent} ev
	 */
	_handleZoomFromInput: function( ev ) {
		if( ev.keyCode != 13 ) {
			return;
		}

		var $input = ev.target;
		var zoom = String( $input.value );
		zoom = zoom.trim();
		zoom = zoom.replace( '%', '' );
		zoom = zoom.replace( ',', '.' );

		if( zoom.length === 0 ) {
			zoom = 100;
		}

		if( isNaN( zoom ) || zoom < 0.1 || zoom == Infinity ) {
			console.warn( '[Einblick.UI._initHeader]' +
				' Invalid zoom value: ' + zoom );
			return;
		}

		zoom /= 100;
		this.zoom = zoom;
		Einblick.setZoomAll( zoom );
		this.update( { zoom: zoom } );
		this.scrollToPage( Einblick.currentPageIndex );
	},


	/**
	 * Handle the zoom selection events.
	 * @param {MouseEvent} ev
	 */
	_handleZoomFromList: function( ev ) {
		var $item = ev.target;
		var data = $item.getAttribute( 'data-zoom' ).split( '|' );
		var dataZoom = data[0];
		var dataType = data[1];

		var $zo = document.querySelector( '#topbar .zoom-options' );
		$zo.style.display = 'none';

		// Zoom value.
		if( dataType == 'zoom' ) {
			this.zoom = Number( dataZoom );
			Einblick.setZoomAll( this.zoom );
			this.update( { zoom: this.zoom } );
		}
		// Named zoom type or layout mode.
		else {
			switch( dataZoom ) {
				case 'fitToWidth':
					this.zoom = Einblick.fitToWidth();
					break;

				case this.PAGE_MODE.CONTINUOUS:
				case this.PAGE_MODE.SINGLE:
					this.changePageMode( dataZoom );
					break;

				default:
					console.warn( '[Einblick.UI._handleZoomFromList]' +
						' Unknown option: ' + dataZoom );
			}
		}

		this.scrollToPage( Einblick.currentPageIndex );
	},


	/**
	 * Initialize Drag&Drop.
	 */
	_initDragAndDrop: function() {
		var $area = document.querySelector( '.canvas-wrap' );

		$area.addEventListener( 'dragover', function( ev ) {
			ev.preventDefault();
		} );

		$area.addEventListener( 'drop', function( ev ) {
			ev.preventDefault();

			var files = ev.dataTransfer.files;

			if( files.length === 0 ) {
				return;
			}

			Einblick.loadFile( files[0].path );
		} );
	},


	/**
	 * Initialize the header.
	 */
	_initHeader: function() {
		var $btnOpenFile = document.querySelector( '#open-file' );
		$btnOpenFile.addEventListener( 'click', this._handleOpenFile.bind( this ) );


		var $btnPagePrev = document.querySelector( '#page-prev' );
		$btnPagePrev.addEventListener( 'click', function( ev ) {
			Einblick.pagePrevious();
		} );

		var $btnPageNext = document.querySelector( '#page-next' );
		$btnPageNext.addEventListener( 'click', function( ev ) {
			Einblick.pageNext();
		} );

		var $inputPage = document.querySelector( '#topbar .index' );
		$inputPage.addEventListener( 'keyup', this._handlePageIndex.bind( this ) );


		this._initZoomOptions();

		var $btnZoom = document.querySelector( '#select-zoom' );
		$btnZoom.addEventListener( 'click', function( ev ) {
			var $zo = document.querySelector( '#topbar .zoom-options' );
			var style = window.getComputedStyle( $zo );

			if( style.display == 'none' ) {
				$zo.style.display = 'block';
			}
			else {
				$zo.style.display = 'none';
			}
		} );

		var $inputZoom = document.querySelector( '#topbar input.zoom' );
		$inputZoom.addEventListener( 'keyup', this._handleZoomFromInput.bind( this ) );
	},


	/**
	 * Register keyboard shortcuts.
	 */
	_initShortcuts: function() {
		var $body = document.body;

		$body.addEventListener( 'keyup', function( ev ) {
			switch( ev.keyCode ) {
				// Arrow left: Previous page.
				case 37:
					if( !Einblick.UI.isInput( ev.target ) ) {
						Einblick.pagePrevious();
					}
					break;

				// Arrow right: Next page.
				case 39:
					if( !Einblick.UI.isInput( ev.target ) ) {
						Einblick.pageNext();
					}
					break;

				// F12: open dev tools
				case 123:
					var win = electron.remote.getCurrentWindow();
					win.openDevTools( { mode: 'undocked' } );
					break;
			}
		} );
	},


	/**
	 * Initialize the zoom options.
	 */
	_initZoomOptions: function() {
		var $list = document.querySelector( '#topbar .zoom-options' );

		var options = [
			{
				cls: 'layout',
				text: Einblick.t( 'layoutSinglePage' ),
				value: this.PAGE_MODE.SINGLE
			},
			{
				cls: 'layout',
				text: Einblick.t( 'layoutContinuous' ),
				value: this.PAGE_MODE.CONTINUOUS
			},
			{ value: '---' },
			{
				cls: 'zoom_named',
				text: Einblick.t( 'fitToWidth' ),
				value: 'fitToWidth'
			},
			{ value: '---' },
			{
				cls: 'zoom',
				text: Einblick.t( '50%' ),
				value: 0.5
			},
			{
				cls: 'zoom',
				text: Einblick.t( '100%' ),
				value: 1.0
			},
			{
				cls: 'zoom',
				text: Einblick.t( '150%' ),
				value: 1.5
			},
			{
				cls: 'zoom',
				text: Einblick.t( '200%' ),
				value: 2.0
			}
		];

		for( var i = 0; i < options.length; i++ ) {
			var o = options[i];
			var $item = document.createElement( 'li' );

			if( o.value == '---' ) {
				$item.className = 'sep';
			}
			else {
				if( o.cls ) {
					$item.className = o.cls;
				}

				$item.innerHTML = o.text;
				$item.setAttribute( 'data-zoom', o.value + '|' + o.cls);
				$item.addEventListener( 'click', this._handleZoomFromList.bind( this ) );
			}

			$list.appendChild( $item );
		}
	},


	/**
	 * Build the sidebar content list.
	 */
	buildContentList: function() {
		if( !Einblick.doc ) {
			return;
		}

		var promise = Einblick.doc.getOutline();

		promise.then( function( outline ) {
			var $list = document.querySelector( '#sidebar .contents' );
			$list.innerHTML = '';

			for( var i = 0; i < outline.length; i++ ) {
				Einblick.UI._buildContentItem( outline[i], $list );
			}
		} );
	},


	/**
	 * Change the page mode.
	 * @param {Einblick.UI.PAGE_MODE} mode Page mode.
	 */
	changePageMode: function( mode ) {
		if( !Einblick.doc || this.mode === mode ) {
			return;
		}

		this.mode = mode;

		var $main = document.querySelector( '#main' );
		var clsNow = $main.className;
		var MODES = this.PAGE_MODE;

		for( var key in MODES ) {
			var m = MODES[key];
			clsNow = clsNow.replace( 'layout-mode-' + m, '' );
		}

		clsNow += ' layout-mode-' + mode;
		$main.className = clsNow.trim();

		if( mode == MODES.SINGLE ) {
			this.hideAllCanvases();

			var $p = document.querySelector( '#pdf-page-' + Einblick.currentPageIndex );
			$p.style.display = '';

			var $cw = document.querySelector( '.canvas-wrap' );
			$cw.scrollTop = 0;
		}
		else {
			this.showAllCanvases();
		}
	},


	/**
	 * Clear the UI of the old document
	 * to prepare for a new one.
	 */
	clear: function() {
		document.querySelector( 'title' ).textContent = '';
		clearTimeout( this._timeoutLoadPage );

		// Delete all canvases.
		this.canvases = {};
		document.querySelector( '.canvas-wrap' ).innerHTML = '';

		this.update( {
			filesize: 0,
			index: 0,
			numPages: 0
		} );
	},


	/**
	 * Format a given size.
	 * @param  {Number} size Size to format, starting at bytes unit.
	 * @return {Object}      Size < 1024 with corresponding unit.
	 */
	formatSize: function( size ) {
		var unit = 'B';

		if( size >= 1000 ) {
			size /= 1000;
			unit = 'KB';
		}

		if( size >= 1000 ) {
			size /= 1000;
			unit = 'MB';
		}

		if( size >= 1000 ) {
			size /= 1000;
			unit = 'GB';
		}

		if( size >= 1000 ) {
			size /= 1000;
			unit = 'TB';
		}

		return {
			size: size,
			unit: unit
		};
	},


	/**
	 * Hide all canvases.
	 */
	hideAllCanvases: function() {
		var $cs = document.querySelectorAll( '.canvas-wrap canvas' );

		for( var i = 0; i < $cs.length; i++ ) {
			$cs[i].style.display = 'none';
		}
	},


	/**
	 * Initialize the UI.
	 * @param {Function} cb Callback when done.
	 */
	init: function( cb ) {
		this._initShortcuts();

		this.mode = this.PAGE_MODE.CONTINUOUS;

		this._initHeader();
		this._initDragAndDrop();

		var $cw = document.querySelector( '.canvas-wrap' );
		$cw.addEventListener( 'scroll', this._handlePageScroll.bind( this ) );

		var $body = document.body;
		$body.addEventListener( 'click', this._closeAll.bind( this ) );

		cb && cb();
	},


	/**
	 * Initialize the canvases for the pages.
	 * @param {Function} cb Callback.
	 */
	initPages: function( cb ) {
		var $cWrap = document.querySelector( '.canvas-wrap' );
		this.canvases = {};

		for( var i = 1; i <= Einblick.doc.numPages; i++ ) {
			var $canvas = document.createElement( 'canvas' );
			$canvas.id = 'pdf-page-' + i;
			$cWrap.appendChild( $canvas );

			this.canvases[i] = {
				canvas: $canvas,
				loaded: false
			};
		}

		cb && cb();
	},


	/**
	 * Check if node is some kind of input node.
	 * @param  {DOMElement} node Node to check.
	 * @return {Boolean}         True if is input, false otherwise.
	 */
	isInput: function( node ) {
		if( !node ) {
			return false;
		}

		var inputs = [
			'input',
			'textarea'
		];
		var tag = node.tagName.toLowerCase();

		if( inputs.indexOf( tag ) >= 0 ) {
			return true;
		}

		return false;
	},


	/**
	 * Scroll to the page with the given index.
	 * @param {Number} index Index of the page to scroll to.
	 */
	scrollToPage: function( index ) {
		if( this.mode === this.PAGE_MODE.SINGLE ) {
			return;
		}

		var first = document.querySelector( '#pdf-page-1' );
		var node = document.querySelector( '#pdf-page-' + index );

		if( first && node ) {
			var top = node.offsetTop - first.offsetTop;
			var $cw = document.querySelector( '.canvas-wrap' );
			$cw.scrollTop = top;
		}
	},


	/**
	 * Show all canvases again after having hidden them.
	 */
	showAllCanvases: function() {
		var $cs = document.querySelectorAll( '.canvas-wrap canvas' );

		for( var i = 0; i < $cs.length; i++ ) {
			$cs[i].style.display = '';
		}
	},


	/**
	 * Update UI elements with values.
	 * @param {Object} data Updated values.
	 */
	update: function( data ) {
		if( typeof data.zoom === 'number' ) {
			var z = data.zoom * 100.0;
			var $z = document.querySelector( '#topbar input.zoom' );
			$z.value = z + '%';
		}

		if( typeof data.index === 'number' ) {
			var $i = document.querySelector( '#topbar input.index' );
			$i.value = data.index;
		}

		if( typeof data.numPages === 'number' ) {
			var $p = document.querySelector( '#topbar .pages' );
			$p.textContent = data.numPages;
		}

		if(
			typeof data.pageWidth === 'number' ||
			typeof data.pageHeight === 'number'
		) {
			var h = data.pageHeight;
			var w = data.pageWidth;

			if( typeof h === 'undefined' ) {
				h = 'auto';
			}
			else {
				h += 'px';
			}

			if( typeof w === 'undefined' ) {
				w = 'auto';
			}
			else {
				w += 'px';
			}

			var $style = document.querySelector( 'style#dynamic-style' );
			$style.textContent = [
				'.canvas-wrap canvas {',
					'height: ' + h + ';',
					'width: ' + w + ';',
				'}'
			].join( '' );
		}

		if( typeof data.filesize === 'number' ) {
			var formatted = this.formatSize( data.filesize );
			var s = formatted.size;
			s = Math.round( s * 100 ) / 100;

			var $s = document.querySelector( '#statusbar .filesize .val' );
			$s.innerHTML = s + '&thinsp;' + formatted.unit;
		}

		if( typeof data.memory === 'number' ) {
			var formatted = this.formatSize( data.memory );
			var s = formatted.size;
			s = Math.round( s * 100 ) / 100;

			var $s = document.querySelector( '#statusbar .memory .val' );
			$s.innerHTML = s + '&thinsp;' + formatted.unit;
		}
	}


};
