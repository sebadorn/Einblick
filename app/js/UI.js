'use strict';


Einblick.UI = {


	PAGE_MODE: {
		CONTINUOUS: 'continous',
		SINGLE: 'single'
	},

	canvases: {},
	mode: null,
	zoom: 1.0,

	_lastSearchResult: null,
	_oldScrollTop: 0,
	_timeoutLoadPage: 0,


	/**
	 * Build the list items and sublists
	 * for the sidebar content list.
	 * @param  {Object}      o Item data.
	 * @return {HTMLElement}   List element.
	 */
	_buildContentItem: function( o ) {
		if( !o ) {
			return null;
		}

		var $arrow = document.createElement( 'span' );
		$arrow.className = 'toggle';

		var $title = document.createElement( 'span' );
		$title.className = 'title';
		$title.textContent = o.title;

		var $label = document.createElement( 'span' );
		$label.className = 'label';
		$label.textContent = o.label || '';

		var $wrap = document.createElement( 'div' );
		$wrap.className = 'wrap';
		$wrap.appendChild( $arrow );
		$wrap.appendChild( $title );
		$wrap.appendChild( $label );

		var $item = document.createElement( 'li' );
		$item.appendChild( $wrap );

		if( o.items ) {
			var tocList = [];

			for( var key in o.items ) {
				tocList.push( o.items[key] );
			}

			tocList.sort( function( a, b ) {
				return ( a.pageIndex > b.pageIndex );
			} );

			var $sublist = document.createElement( 'ol' );
			$sublist.className = 'sublist';

			for( var i = 0; i < tocList.length; i++ ) {
				var $subitem = Einblick.UI._buildContentItem( tocList[i] );
				$sublist.appendChild( $subitem );
			}

			$arrow.className += ' fa fa-caret-right';
			$arrow.addEventListener( 'mouseup', Einblick.UI._toggleListTOC );

			$item.appendChild( $sublist );
		}

		$title.setAttribute( 'data-page', o.pageIndex );
		$title.addEventListener( 'click', this._showSelectedContentItem );

		return $item;
	},


	/**
	 * Handle a general click event and
	 * close all opened submenus and the like.
	 * @param {MouseEvent} ev
	 */
	_closeAll: function( ev ) {
		var t = ev ? ev.target : null;
		var $laz = document.querySelector( '.layout-and-zoom' );

		var $sr = document.querySelector( '.search-results' );
		$sr.style.display = 'none';

		if( !t || !$laz.contains( t ) ) {
			var $zo = document.querySelector( '.zoom-options' );
			$zo.style.display = 'none';
		}
	},


	/**
	 * Get the coordinates of words in a text node.
	 * @param  {Text}   textNode
	 * @param  {String} word
	 * @return {Array<ClientRect>}
	 */
	_findWordsInText: function( textNode, word ) {
		word = word.toLowerCase();

		var rects = [];
		var text = textNode.textContent.toLowerCase();
		var offset = 0;

		while( text.length > 0 ) {
			var pos = text.indexOf( word );

			if( pos < 0 ) {
				break;
			}

			pos += offset;

			var range = document.createRange();
			var end = pos + word.length;

			try {
				range.setStart( textNode, pos );
				range.setEnd( textNode, end );
			}
			catch( err ) {
				console.error( '[Einblick.UI._findWordsInText] ' + err.message );
				break;
			}

			var clientRects = range.getClientRects();

			if( clientRects.length >= 1 ) {
				rects.push( clientRects[0] );
			}

			var endWithoutOffset = end - offset;
			text = text.substr( endWithoutOffset );
			offset += endWithoutOffset;
		}

		return rects;
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

		// Scrolled horizontally. Ignore.
		if( ev.target.scrollTop == this._oldScrollTop ) {
			return;
		}

		this._timeoutLoadPage = setTimeout( function() {
			var $p = document.querySelector( '#pdf-page-1' );

			if( !$p ) {
				return;
			}

			var pStyle = window.getComputedStyle( $p );
			var pageHeight = Number( pStyle.height.replace( 'px', '' ) );

			var scrollTop = ev.target.scrollTop;
			var segment = pageHeight + 4;
			var pageIndex = ~~( scrollTop / segment ) + 1;

			Einblick.currentPageIndex = pageIndex;
			Einblick.showPage( pageIndex );
			Einblick.UI.update( { index: pageIndex } );

			Einblick.UI._oldScrollTop = scrollTop;
		}, 50 );
	},


	/**
	 * Handle the serch input.
	 * @param {KeyEvent} ev
	 */
	_handleSearch: function( ev ) {
		if( ev.keyCode != 13 ) {
			return;
		}

		this._closeAll();

		var text = String( ev.target.value ).trim();
		var result = Einblick.search( text );
		Einblick.UI._lastSearchResult = result;

		var $results = document.querySelector( '.search-results' );
		$results.innerHTML = '';

		for( var i = 0; i < result.matches.length; i++ ) {
			var match = result.matches[i];
			var $item = document.createElement( 'li' );
			$item.setAttribute( 'data-page', match.page );
			$item.textContent = 'page: ' + match.page;

			$results.appendChild( $item );
		}

		$results.style.display = 'block';
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


	highlightMatches: function( pageIndex ) {
		var lastSearch = Einblick.UI._lastSearchResult;

		var $page = document.getElementById( 'pdf-page-' + pageIndex );
		var $highlightContainer = $page.querySelector( '.search-highlights' );
		$highlightContainer.innerHTML = '';

		if(
			!lastSearch ||
			typeof lastSearch.term !== 'string' ||
			lastSearch.term.length === 0
		) {
			return;
		}

		var $cwrap = document.querySelector( '.canvas-wrap' );
		var pageTexts = $page.querySelectorAll( '.page-text div' );

		var offset = {
			left: $cwrap.scrollLeft - $page.offsetLeft,
			top: $cwrap.scrollTop - $page.offsetTop
		};

		for( var i = 0; i < pageTexts.length; i++ ) {
			var $pt = pageTexts[i];

			if( $pt.childNodes.length === 0 ) {
				continue;
			}

			var textNode = $pt.childNodes[0];
			var rects = this._findWordsInText( textNode, lastSearch.term );

			for( var j = 0; j < rects.length; j++ ) {
				var r = rects[j];
				var $item = document.createElement( 'span' );
				$item.className = 'search-highlight';
				$item.style.left = ( r.left + offset.left ) + 'px';
				$item.style.top = ( r.top + offset.top ) + 'px';
				$item.style.height = r.height + 'px';
				$item.style.width = r.width + 'px';

				$highlightContainer.appendChild( $item );
			}
		}
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
		var $btnSidebar = document.querySelector( '#toggle-sidebar' );
		$btnSidebar.addEventListener( 'click', this._toggleSidebar.bind( this ) );

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


		var $inputSearch = document.querySelector( '#search-input' );
		$inputSearch.addEventListener( 'keyup', this._handleSearch.bind( this ) );

		var $results = document.querySelector( '.search-results' );
		$results.addEventListener( 'click', function( ev ) {
			var $item = ev.target;
			var pageIndex = Number( $item.getAttribute( 'data-page' ) );

			Einblick.showPage( pageIndex, function() {
				Einblick.UI.scrollToPage( pageIndex );
			} );
		} );

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
				text: Einblick.t( '75%' ),
				value: 0.75
			},
			{
				cls: 'zoom',
				text: Einblick.t( '100%' ),
				value: 1.0
			},
			{
				cls: 'zoom',
				text: Einblick.t( '125%' ),
				value: 1.25
			},
			{
				cls: 'zoom',
				text: Einblick.t( '150%' ),
				value: 1.5
			},
			{
				cls: 'zoom',
				text: Einblick.t( '175%' ),
				value: 1.75
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
	 * For the selected content item (sidebar toc),
	 * load the page and scroll to it.
	 * @param {Event} ev
	 */
	_showSelectedContentItem: function( ev ) {
		var $item = ev.currentTarget || ev.target;
		var index = $item.getAttribute( 'data-page' );
		index = Number( index );

		Einblick.showPage( index, function() {
			Einblick.UI.scrollToPage( index );
		} );
	},


	/**
	 * Toggle the visibility of a TOC sublist.
	 * @param {MouseEvent} ev
	 */
	_toggleListTOC: function( ev ) {
		var $arrow = ev.currentTarget || ev.target;
		var $item = $arrow.parentNode.parentNode;
		var clsArr = $item.className.split( ' ' );
		var pos = clsArr.indexOf( 'extended' );

		if( pos >= 0 ) {
			$arrow.className = $arrow.className.replace( 'caret-down', 'caret-right' );
			clsArr.splice( pos, 1 );
		}
		else {
			$arrow.className = $arrow.className.replace( 'caret-right', 'caret-down' );
			clsArr.push( 'extended' );
		}

		$item.className = clsArr.join( ' ' );
	},


	/**
	 * Toggle the sidebar.
	 * @param {MouseEvent} ev
	 */
	_toggleSidebar: function( ev ) {
		if( !Einblick.doc ) {
			return;
		}

		var $arrow = ev.target;
		var $sb = document.querySelector( '#sidebar' );

		if( $sb.className == 'extended' ) {
			$sb.className = '';
			$arrow.className = $arrow.className.replace( '-left', '-right' );
		}
		else {
			$sb.className = 'extended';
			$arrow.className = $arrow.className.replace( '-right', '-left' );
		}
	},


	/**
	 * Build the sidebar content list.
	 */
	buildContentList: function() {
		if( !Einblick.doc ) {
			return;
		}

		var $list = document.querySelector( '#sidebar .contents' );
		$list.innerHTML = '';

		var tocList = [];

		for( var key in Einblick.toc ) {
			tocList.push( Einblick.toc[key] );
		}

		tocList.sort( function( a, b ) {
			return ( a.pageIndex > b.pageIndex );
		} );

		for( var i = 0; i < tocList.length; i++ ) {
			var $item = Einblick.UI._buildContentItem( tocList[i] );
			$list.appendChild( $item );
		}
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
		var $pw = document.querySelectorAll( '.canvas-wrap .page-wrap' );

		for( var i = 0; i < $pw.length; i++ ) {
			$pw[i].style.display = 'none';
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
		this._oldScrollTop = $cw.scrollTop;
		$cw.addEventListener( 'scroll', this._handlePageScroll.bind( this ) );

		var $body = document.body;
		$body.addEventListener( 'click', this._closeAll.bind( this ) );

		this.translate(
			document.querySelectorAll( '[data-trans]' )
		);

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
			var $page = document.createElement( 'div' );
			$page.className = 'page-wrap';
			$page.id = 'pdf-page-' + i;

			var $canvas = document.createElement( 'canvas' );
			var $search = document.createElement( 'div' );
			$search.className = 'search-highlights';

			$page.appendChild( $canvas );
			$page.appendChild( $search );
			$cWrap.appendChild( $page );

			this.canvases[i] = {
				canvas: $canvas,
				loaded: false,
				page: $page,
				text: null
			};
		}

		cb && cb();
	},


	/**
	 * Check if node is some kind of input node.
	 * @param  {HTMLElement} $node Node to check.
	 * @return {Boolean}           True if is input, false otherwise.
	 */
	isInput: function( $node ) {
		if( !$node ) {
			return false;
		}

		var inputs = [
			'input',
			'textarea'
		];
		var tag = $node.tagName.toLowerCase();

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
		var $pw = document.querySelectorAll( '.canvas-wrap .page-wrap' );

		for( var i = 0; i < $pw.length; i++ ) {
			$pw[i].style.display = '';
		}
	},


	/**
	 * Set the translated text for a given node.
	 * @param {HTMLElement|Array<HTMLElement>} $node
	 */
	translate: function( $node ) {
		if( !$node ) {
			return;
		}

		if( Array.isArray( $node ) || $node instanceof NodeList ) {
			for( var i = 0; i < $node.length; i++ ) {
				Einblick.UI.translate( $node[i] );
			}

			return;
		}

		var key = $node.getAttribute( 'data-trans' );

		if( !key ) {
			return;
		}

		var text = Einblick.t( key );

		$node.innerHTML = text;
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

			var zoom = Einblick.UI.zoom;

			var $style = document.querySelector( 'style#dynamic-style' );
			$style.textContent = [
				'.page-wrap, .page-wrap canvas {',
					'height: ' + h + ';',
					'width: ' + w + ';',
				'}',
				'.page-text {',
					'transform: scale(' + zoom + ', ' + zoom + ')',
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
