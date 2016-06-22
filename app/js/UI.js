'use strict';


Einblick.UI = {


	PAGE_MODE: {
		CONTINUOUS: 1,
		SINGLE: 2
	},

	canvases: {},
	mode: null,
	zoom: 1.0,

	_timeoutLoadPage: 0,


	/**
	 * Handle a general click event and
	 * close all opened submenus and the like.
	 * @param {MouseEvent} ev
	 */
	_closeAll: function( ev ) {
		var t = ev.target;

		if( !$.contains( $( '.layout-and-zoom' )[0], t ) ) {
			$( '.zoom-options' ).hide();
		}
	},


	/**
	 * Handle the open file trigger.
	 * @param {Event} ev
	 */
	_handleOpenFile: function( ev ) {
		var $file = $( '<input type="file" />' );

		$file.on( 'change', function( evFile ) {
			if( evFile.target.files.length > 0 ) {
				var p = evFile.target.files[0].path;
				Einblick.loadFile( p );
			}
		} );

		$file.click();
	},


	/**
	 * Handle the page index input events.
	 * @param {KeyEvent} ev
	 */
	_handlePageIndex: function( ev ) {
		if( ev.keyCode != 13 ) {
			return;
		}

		var $input = $( ev.delegateTarget );
		var index = Number( $input.val() );

		if( isNaN( index ) ) {
			return;
		}

		index = Einblick.showPage( index, function() {
			$input.select();
			$input.focus();
		} );
		this.scrollToPage( index );

		if( this.mode === this.PAGE_MODE.SINGLE ) {
			$( '.canvas-wrap canvas' ).hide();
			$( '#pdf-page-' + index ).show();
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
			var scrollTop = ev.delegateTarget.scrollTop;
			var pageHeight = $( '#pdf-page-1' ).height();
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

		var $input = $( ev.delegateTarget );
		var zoom = $input.val();
		zoom = $.trim( zoom );
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
		var $item = $( ev.delegateTarget );
		var data = $item.data( 'zoom' );

		$( '#topbar .zoom-options' ).hide();

		// Zoom value.
		if( data.type == 'zoom' ) {
			this.zoom = data.value;
			Einblick.setZoomAll( data.value );
			this.update( { zoom: data.value } );
		}
		// Named zoom type or layout mode.
		else {
			switch( data.value ) {
				case 'fitToWidth':
					this.zoom = Einblick.fitToWidth();
					break;

				case this.PAGE_MODE.CONTINUOUS:
				case this.PAGE_MODE.SINGLE:
					this.changePageMode( data.value );
					break;

				default:
					console.warn( '[Einblick.UI._handleZoomFromList]' +
						' Unknown option: ' + data.value );
			}
		}

		this.scrollToPage( Einblick.currentPageIndex );
	},


	/**
	 * Initialize Drag&Drop.
	 */
	_initDragAndDrop: function() {
		var $area = $( '.canvas-wrap' );

		$area.on( 'dragover', function( ev ) {
			ev.preventDefault();
		} );

		$area.on( 'drop', function( ev ) {
			ev.preventDefault();

			var files = ev.originalEvent.dataTransfer.files;

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
		var $btnOpenFile = $( '#open-file' );
		$btnOpenFile.click( this._handleOpenFile.bind( this ) );


		var $btnPagePrev = $( '#page-prev' );
		$btnPagePrev.click( function( ev ) {
			Einblick.pagePrevious();
		} );

		var $btnPageNext = $( '#page-next' );
		$btnPageNext.click( function( ev ) {
			Einblick.pageNext();
		} );

		var $inputPage = $( '#topbar .index' );
		$inputPage.keyup( this._handlePageIndex.bind( this ) );


		this._initZoomOptions();

		var $btnZoom = $( '#select-zoom' );
		$btnZoom.click( function( ev ) {
			$( '#topbar .zoom-options' ).toggle();
		} );

		var $inputZoom = $( '#topbar .zoom' );
		$inputZoom.keyup( this._handleZoomFromInput.bind( this ) );
	},


	/**
	 * Register keyboard shortcuts.
	 */
	_initShortcuts: function() {
		$( 'body' ).keyup( function( ev ) {
			// F12: toggle dev tools
			if( ev.keyCode == 123 ) {
				electron.remote.getCurrentWindow().toggleDevTools();
			}
		} );
	},


	/**
	 * Initialize the zoom options.
	 */
	_initZoomOptions: function() {
		var $list = $( '#topbar .zoom-options' );

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
			var $item = $( '<li></li>' );

			if( o.value == '---' ) {
				$item.addClass( 'sep' );
			}
			else {
				o.cls && $item.addClass( o.cls );
				$item.html( o.text );
				$item.data( 'zoom', {
					value: o.value,
					type: o.cls
				} );
				$item.click( this._handleZoomFromList.bind( this ) );
			}

			$list.append( $item );
		}
	},


	/**
	 * Change the page mode.
	 * @param {Einblick.UI.PAGE_MODE} mode Page mode.
	 */
	changePageMode: function( mode ) {
		if( this.mode === mode ) {
			return;
		}

		this.mode = mode;

		var clsStr = '';
		var MODES = this.PAGE_MODE;

		for( var key in MODES ) {
			var m = MODES[key];
			clsStr += ' layout-mode-' + m;
		}

		$( '#main' ).removeClass( clsStr );
		$( '#main' ).addClass( 'layout-mode-' + mode );

		if( mode == MODES.SINGLE ) {
			$( '.canvas-wrap canvas' ).hide();
			$( '#pdf-page-' + Einblick.currentPageIndex ).show();
			$( '.canvas-wrap' ).scrollTop( 0 );
		}
		else {
			$( '.canvas-wrap canvas' ).show();
		}
	},


	/**
	 * Clear the UI of the old document
	 * to prepare for a new one.
	 */
	clear: function() {
		$( 'title' ).text( '' );
		clearTimeout( this._timeoutLoadPage );
		this.canvases = {};
		$( '.canvas-wrap' ).html( '' );

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
	 * Initialize the UI.
	 * @param {Function} cb Callback when done.
	 */
	init: function( cb ) {
		this._initShortcuts();

		this.mode = this.PAGE_MODE.CONTINUOUS;

		this._initHeader();
		this._initDragAndDrop();
		$( '.canvas-wrap' ).scroll( this._handlePageScroll.bind( this ) );

		$( 'body' ).click( this._closeAll.bind( this ) );

		cb && cb();
	},


	/**
	 * Initialize the canvases for the pages.
	 * @param {Function} cb Callback.
	 */
	initPages: function( cb ) {
		var $cWrap = $( '.canvas-wrap' );
		this.canvases = {};

		for( var i = 1; i <= Einblick.doc.numPages; i++ ) {
			var $canvas = $( '<canvas></canvas>' );
			$canvas.attr( 'id', 'pdf-page-' + i );

			$cWrap.append( $canvas );

			this.canvases[i] = {
				canvas: $canvas[0],
				loaded: false
			};
		}

		cb && cb();
	},


	/**
	 * Scroll to the page with the given index.
	 * @param {Number} index Index of the page to scroll to.
	 */
	scrollToPage: function( index ) {
		if( this.mode === this.PAGE_MODE.SINGLE ) {
			return;
		}

		var first = $( '#pdf-page-1' )[0];
		var node = $( '#pdf-page-' + index )[0];

		if( first && node ) {
			var top = node.offsetTop - first.offsetTop;
			$( '.canvas-wrap' ).scrollTop( top );
		}
	},


	/**
	 * Update UI elements with values.
	 * @param {Object} data Updated values.
	 */
	update: function( data ) {
		if( typeof data.zoom === 'number' ) {
			var z = data.zoom * 100.0;
			$( '#topbar .zoom' ).val( z + '%' );
		}

		if( typeof data.index === 'number' ) {
			$( '#topbar .index' ).val( data.index );
		}

		if( typeof data.numPages === 'number' ) {
			$( '#topbar .pages' ).text( data.numPages );
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

			var $style = $( 'style#dynamic-style' );
			$style.text( [
				'.canvas-wrap canvas {',
					'height: ' + h + ';',
					'width: ' + w + ';',
				'}'
			].join( '' ) );
		}

		if( typeof data.filesize === 'number' ) {
			var formatted = this.formatSize( data.filesize );
			var s = formatted.size;
			s = Math.round( s * 100 ) / 100;

			$( '#statusbar .filesize .val' ).html( s + '&thinsp;' + formatted.unit );
		}

		if( typeof data.memory === 'number' ) {
			var formatted = this.formatSize( data.memory );
			var s = formatted.size;
			s = Math.round( s * 100 ) / 100;

			$( '#statusbar .memory .val' ).html( s + '&thinsp;' + formatted.unit );
		}
	}


};
