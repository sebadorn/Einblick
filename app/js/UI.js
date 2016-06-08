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
	},


	/**
	 * Initialize the UI.
	 * @param {Function} cb Callback when done.
	 */
	init: function( cb ) {
		this.canvas = document.getElementById( 'pdf' );
		this._initHeader();

		cb && cb();
	}


};
