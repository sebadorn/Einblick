'use strict';


Einblick.Search = {


	_currentSelectedResult: null,
	_lastSearchResult: null,

	isCaseSensitive: false,
	searchStructure: {},


	/**
	 * Build a search highlight item.
	 * @param  {ClientRect}  rect
	 * @param  {Object}      offset
	 * @return {HTMLElement}
	 */
	_buildHighlightItem: function( rect, offset ) {
		var item = document.createElement( 'span' );

		item.className = 'search-highlight';
		item.style.left = ( rect.left + offset.left ) + 'px';
		item.style.top = ( rect.top + offset.top ) + 'px';
		item.style.height = rect.height + 'px';
		item.style.width = rect.width + 'px';

		return item;
	},


	/**
	 * Build the search result list.
	 */
	_buildResultList: function() {
		var lsr = this._lastSearchResult;

		var results = document.querySelector( '.search-results' );
		results.innerHTML = '';

		for( var i = 0; i < lsr.matches.length; i++ ) {
			var match = lsr.matches[i];
			var item = document.createElement( 'li' );
			item.setAttribute( 'data-page', match.page );
			item.textContent = 'page: ' + match.page;

			results.appendChild( item );
		}
	},


	/**
	 * Get a ClientRect from the given text node and range positions.
	 * @param  {Node}            textNode Target text node.
	 * @param  {Number}          start    Range start position.
	 * @param  {Number}          end      Range end position.
	 * @return {ClientRect|null}          The (first) ClientRect or null.
	 */
	_getRectFromRange: function( textNode, start, end ) {
		var range = document.createRange();

		try {
			range.setStart( textNode, start );
			range.setEnd( textNode, end );
		}
		catch( err ) {
			console.error( '[Einblick.UI._findWordsInText] ' + err.message );

			return null;
		}

		var clientRects = range.getClientRects();

		return ( clientRects.length >= 1 ) ? clientRects[0] : null;
	},


	/**
	 * Handle the serch input.
	 * @param {KeyEvent} ev
	 */
	_handleSearch: function( ev ) {
		if( ev.keyCode == 27 ) {
			this.hideSearchbar();
		}

		if( ev.keyCode != 13 ) {
			return;
		}

		Einblick.UI.closeAllOverlays();

		var text = String( ev.target.value ).trim();
		var result = this.search( text );

		this._lastSearchResult = result;
		this._currentSelectedResult = null;

		this._buildResultList();
		this.jumpToNextResult();
	},


	/**
	 * Build the search structure.
	 * @param {Object} pageTexts
	 */
	buildSearchStructure: function( pageTexts ) {
		this.searchStructure = {};

		for( var pageIndex in pageTexts ) {
			var text = '';
			var p = pageTexts[pageIndex];

			if( !p || !p.items ) {
				continue;
			}

			for( var i = 0; i < p.items.length; i++ ) {
				var item = p.items[i];
				text += item.str + ' ';
			}

			text = text.trim();

			if( text.length > 0 ) {
				this.searchStructure[pageIndex] = text;
			}
		}
	},


	/**
	 * Get the coordinates of words in a text node.
	 * @param  {Text}   textNode
	 * @param  {String} word
	 * @return {Array<ClientRect>}
	 */
	findWordsInText: function( textNode, word ) {
		var rects = [];
		var text = textNode.textContent;
		var offset = 0;

		if( !this.isCaseSensitive ) {
			word = word.toLowerCase();
			text = text.toLowerCase();
		}

		while( text.length > 0 ) {
			var pos = text.indexOf( word );

			if( pos < 0 ) {
				break;
			}

			pos += offset;

			var end = pos + word.length;
			var rect = this._getRectFromRange( textNode, pos, end );

			if( rect ) {
				rects.push( rect );
			}

			var endWithoutOffset = end - offset;
			text = text.substr( endWithoutOffset );
			offset += endWithoutOffset;
		}

		return rects;
	},


	/**
	 * Hide the searchbar.
	 */
	hideSearchbar: function() {
		var sb = document.getElementById( 'searchbar' );
		sb.style.display = 'none';
	},


	/**
	 * Highlight all search result matches on the page.
	 * @param {Number} pageIndex Page index.
	 */
	highlightMatches: function( pageIndex ) {
		var lastSearch = this._lastSearchResult;

		var page = document.getElementById( 'pdf-page-' + pageIndex );
		var highlightContainer = page.querySelector( '.search-highlights' );
		highlightContainer.innerHTML = '';

		if(
			!lastSearch ||
			typeof lastSearch.term !== 'string' ||
			lastSearch.term.length === 0
		) {
			return;
		}

		var cwrap = document.querySelector( '.canvas-wrap' );
		var pageTexts = page.querySelectorAll( '.page-text div' );

		var offset = {
			left: cwrap.scrollLeft - page.offsetLeft,
			top: cwrap.scrollTop - page.offsetTop
		};

		for( var i = 0; i < pageTexts.length; i++ ) {
			var pt = pageTexts[i];

			if( pt.childNodes.length === 0 ) {
				continue;
			}

			var textNode = pt.childNodes[0];
			var rects = this.findWordsInText( textNode, lastSearch.term );

			for( var j = 0; j < rects.length; j++ ) {
				var r = rects[j];
				var item = this._buildHighlightItem( r, offset );
				highlightContainer.appendChild( item );
			}
		}
	},


	/**
	 * Initialize the search UI.
	 */
	initUI: function() {
		var searchbar = document.getElementById( 'searchbar' );

		var btnJumpNext = document.getElementById( 'jump-next-result' );
		btnJumpNext.addEventListener( 'click', this.jumpToNextResult.bind( this ) );

		var btnJumpPrev = document.getElementById( 'jump-prev-result' );
		btnJumpPrev.addEventListener( 'click', this.jumpToPrevResult.bind( this ) );

		var btnCase = document.getElementById( 'search-case-sensitive' );
		btnCase.addEventListener( 'click', this.toggleCaseSensitive.bind( this ) );

		var inputSearch = document.getElementById( 'search-input' );
		inputSearch.addEventListener( 'keyup', this._handleSearch.bind( this ) );

		var results = searchbar.querySelector( '.search-results' );
		results.addEventListener( 'click', function( ev ) {
			var item = ev.target;
			var pageIndex = Number( item.getAttribute( 'data-page' ) );

			Einblick.showPage( pageIndex, function() {
				Einblick.UI.scrollToPage( pageIndex );
			} );
		} );
	},


	/**
	 * Jump to the next page.
	 * @param {Event} ev
	 */
	jumpToNextResult: function( ev ) {
		if( !this._lastSearchResult ) {
			return;
		}

		var lsr = this._lastSearchResult;
		var pos = this._currentSelectedResult;
		pos = ( pos === null ) ? 0 : pos + 1;

		if( pos >= lsr.matches.length ) {
			pos = 0;
		}

		var match = lsr.matches[pos];

		if( !match ) {
			return;
		}

		Einblick.showPage( match.page, function() {
			Einblick.UI.scrollToPage( match.page );
		} );

		this._currentSelectedResult = pos;
	},


	/**
	 * Jump to the previous page.
	 * @param {Event} ev
	 */
	jumpToPrevResult: function( ev ) {
		if( !this._lastSearchResult ) {
			return;
		}

		var lsr = this._lastSearchResult;
		var pos = this._currentSelectedResult;
		pos = ( pos === null ) ? 0 : pos - 1;

		if( pos < 0 ) {
			pos = lsr.matches.length - 1;
		}

		var match = lsr.matches[pos];

		if( !match ) {
			return;
		}

		Einblick.showPage( match.page, function() {
			Einblick.UI.scrollToPage( match.page );
		} );

		this._currentSelectedResult = pos;
	},


	/**
	 * Search for the given String.
	 * @param  {String} str String to search.
	 * @return {Object}     Matches found on pages.
	 */
	search: function( str ) {
		str = str.trim();

		var result = {
			term: str,
			matches: []
		};

		if( str.length === 0 ) {
			return result;
		}

		// Escape all special characters in the search term.
		str = str.replace( /[-\/\\^$*+?.()|[\]{}]/g, '\\$&' );
		var flags = this.isCaseSensitive ? 'g' : 'gi';
		var regex = new RegExp( str, flags );
console.debug(str, flags, regex);
		for( var pageIndex in this.searchStructure ) {
			var text = this.searchStructure[pageIndex];
			var matches = regex.exec( text );

			if( !matches ) {
				continue;
			}

			result.matches.push( {
				page: pageIndex,
				numMatches: matches.length
			} );
		}

		return result;
	},


	/**
	 * Show the searchbar.
	 */
	showSearchbar: function() {
		var sb = document.getElementById( 'searchbar' );
		sb.style.display = 'block';

		var si = document.getElementById( 'search-input' );
		si.focus();
	},


	/**
	 * Toggle case sensitivity.
	 * @param {Event} ev
	 */
	toggleCaseSensitive: function( ev ) {
		this.isCaseSensitive = !this.isCaseSensitive;
	}


};
