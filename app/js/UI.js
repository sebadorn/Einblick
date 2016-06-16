'use strict';


Einblick.UI = {


	canvases: {},

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

		Einblick.showPage( index, function() {
			$input.select();
			$input.focus();
		} );
	},


	/**
	 * Handle the scroll event on the pages container.
	 * @param {ScrollEvent} ev
	 */
	_handlePageScroll: function( ev ) {
		clearTimeout( this._timeoutLoadPage );

		this._timeoutLoadPage = setTimeout( function() {
			var scrollTop = ev.delegateTarget.scrollTop;
			var pageHeight = $( '#pdf-page-1' ).height();
			var segment = pageHeight + 4;
			var pageIndex = ~~( scrollTop / segment ) + 1;

			Einblick.showPage( pageIndex );
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
		Einblick.setZoomAll( zoom );
		Einblick.UI.update( { zoom: zoom } );
	},


	/**
	 * Handle the zoom selection events.
	 * @param {MouseEvent} ev
	 */
	_handleZoomFromList: function( ev ) {
		var $item = $( ev.delegateTarget );
		var data = $item.data( 'zoom' );

		$( '#topbar .zoom-options' ).hide();

		if( !isNaN( data ) ) {
			Einblick.setZoomAll( data );
			Einblick.UI.update( { zoom: data } );
			return;
		}

		switch( data ) {
			case 'fitToWidth':
				Einblick.fitToWidth();
				break;

			default:
				console.warn( '[Einblick.UI._handleZoomFromList]' +
					' Unknown option: ' + data );
		}
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
		$btnOpenFile.click( this._handleOpenFile );


		var $btnPagePrev = $( '#page-prev' );
		$btnPagePrev.click( function( ev ) {
			Einblick.pagePrevious();
		} );

		var $btnPageNext = $( '#page-next' );
		$btnPageNext.click( function( ev ) {
			Einblick.pageNext();
		} );

		var $inputPage = $( '#topbar .index' );
		$inputPage.keyup( this._handlePageIndex );


		this._initZoomOptions();

		var $btnZoom = $( '#select-zoom' );
		$btnZoom.click( function( ev ) {
			$( '#topbar .zoom-options' ).toggle();
		} );

		var $inputZoom = $( '#topbar .zoom' );
		$inputZoom.keyup( this._handleZoomFromInput );
	},


	/**
	 * Initialize the zoom options.
	 */
	_initZoomOptions: function() {
		var $list = $( '#topbar .zoom-options' );

		var options = [
			{
				text: Einblick.t( 'fitToWidth' ),
				value: 'fitToWidth'
			},
			{ value: '---' },
			{
				text: Einblick.t( '50%' ),
				value: 0.5
			},
			{
				text: Einblick.t( '100%' ),
				value: 1.0
			},
			{
				text: Einblick.t( '150%' ),
				value: 1.5
			},
			{
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
				$item.html( o.text );
				$item.data( 'zoom', o.value );
				$item.click( this._handleZoomFromList );
			}

			$list.append( $item );
		}
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
			var formatted = Einblick.UI.formatSize( data.filesize );
			var s = formatted.size;
			s = Math.round( s * 100 ) / 100;

			$( '#statusbar .filesize .val' ).html( s + '&thinsp;' + formatted.unit );
		}

		if( typeof data.memory === 'number' ) {
			var formatted = Einblick.UI.formatSize( data.memory );
			var s = formatted.size;
			s = Math.round( s * 100 ) / 100;

			$( '#statusbar .memory .val' ).html( s + '&thinsp;' + formatted.unit );
		}
	}


};
