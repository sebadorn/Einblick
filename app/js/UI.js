'use strict';


Einblick.UI = {


	canvas: null,


	/**
	 * Initialize the header.
	 */
	_initHeader: function() {
		var $btnOpenFile = $( '#open-file' );
		$btnOpenFile.click( function( ev ) {
			var $file = $( '<input type="file" />' );

			$file.on( 'change', function( ev ) {
				if( ev.target.files.length > 0 ) {
					var p = ev.target.files[0].path;
					Einblick.loadFile( p );
				}
			} );

			$file.click();
		} );

		var $btnPagePrev = $( '#page-prev' );
		$btnPagePrev.click( function( ev ) {
			Einblick.pagePrevious();
		} );

		var $btnPageNext = $( '#page-next' );
		$btnPageNext.click( function( ev ) {
			Einblick.pageNext();
		} );

		var $inputPage = $( '#topbar .index' );
		$inputPage.keyup( function( ev ) {
			if( ev.keyCode != 13 ) {
				return;
			}

			var index = Number( $inputPage.val() );

			if( isNaN( index ) ) {
				return;
			}

			Einblick.showPage( index, function() {
				$inputPage.select();
				$inputPage.focus();
			} );
		} );
	},


	/**
	 * Initialize the UI.
	 * @param {Function} cb Callback when done.
	 */
	init: function( cb ) {
		this.canvas = document.getElementById( 'pdf' );
		this._initHeader();

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

		if( typeof data.filesize === 'number' ) {
			var s = data.filesize;
			var unit = 'B';

			if( s >= 1000 ) {
				s /= 1000;
				unit = 'KB';
			}

			if( s >= 1000 ) {
				s /= 1000;
				unit = 'MB';
			}

			if( s >= 1000 ) {
				s /= 1000;
				unit = 'GB';
			}

			if( s >= 1000 ) {
				s /= 1000;
				unit = 'TB';
			}

			s = Math.round( s * 100 ) / 100;

			$( '#statusbar .filesize' ).html( s + '&thinsp;' + unit );
		}
	}


};
