var Graft;
(function (global, doc) {

    var root = doc.documentElement || doc;

    Graft = function( node, config ){
        initGraft.apply( this, arguments );
    };

    Graft.prototype = {

        config: null,

        bindings: null,

        init: function(){},

        listen: function ( eventSelector, listener ) {

            var bits = eventSelector.match(/(?:^(\w+)\:)*([\w\._-]+)*(?:\s(.+))*/);
            var namespace = bits[ 1 ];
            var event = bits[ 2 ];
            var selector = bits[ 3 ];

            if ( namespace && event ) {
                EventBus.getBus( namespace ).listen( event, listener );
            } else if ( event && selector ) {
                delegate( this.node, event, selector, listener );
            } else if ( event ) {
                addListener( node, event, listener );
            }

        },

        deafen: function ( eventSelector, listener ) {

            var bits = eventSelector.match(/(?:^(\w+)\:)*([\w\._-]+)*(?:\s(.+))*/);
            var namespace = bits[ 1 ];
            var event = bits[ 2 ];
            var selector = bits[ 3 ];

            if ( namespace && event ) {
                EventBus.getBus( namespace ).deafen( event, listener );
            } else if ( event && selector ) {
                undelegate( this.node, event, selector, listener );
            } else if ( event ) {
                removeListener( node, event, listener );
            }

        },

        notify: function ( event, data ) {

            var bits = event.match(/(?:^(\w+)\:)*([\w\._-]+)/);
            var namespace = bits[ 1 ];
            var event = bits[ 2 ];

            if ( namespace && event ) {
                EventBus.getBus( namespace ).notify( event, data );
            } else {
                notify( this.node, event, data );
            }

        }

    };


    Graft.sub = function( properties ){
        function Sub( node, config ){
            initGraft.apply( this, arguments );
        }
        Sub.prototype = mixin( clone( this.prototype ), properties );
        Sub.sub = this.sub;
        Sub.__super__ = this;
        return Sub;
    };


    Graft.wrapNode = function( node ){
        return node;
    };

    function EventBus(){
        this.listeners = {};
    }

    EventBus.prototype = {
        listeners: null,
        listen: function( event, listener ){
            this.deafen( event, listener );
            var list = this.listeners[ event ];
            list.push( listener );
            this.listeners[ event ] = list;
        },
        deafen: function( event, listener ){
            var list = this.listeners[ event ] || [];
            var index = list.length;
            while( index-- ) {
                if ( list[ index ] === listener ) {
                    list.splice( index, 1 );
                }
            }
            this.listeners[ event ] = list;
        },
        notify: function( event, data ){
            var list = ( this.listeners[ event ] || [] ).concat();
            var size = list.length;
            var index = 0;
            var listener;
            event = {type:event, data:data};
            for(;index<size;index++){
                listener = list[ index ];
                if ( 'handleEvent' in listener
                    && typeof listener.handleEvent === 'function' ) {
                    try {
                        listener.handleEvent( event );
                    } catch (e) {}
                } else if ( typeof listener === 'function' ) {
                    try {
                        listener( event );
                    } catch (e) {}
                }
            }
        }
    };

    EventBus.registry = {};

    EventBus.getBus = Graft.getBus = function( namespace ){
        if ( !EventBus.registry[ namespace ] ) {
            EventBus.registry[ namespace ] = new EventBus();
        }
        return EventBus.registry[ namespace ];
    };


    function initGraft( node, config ){
        this.node = Graft.wrapNode( node );
        this.config = mixin(mixin({}, this.config),config);
        if ( this.bindings ) {
            initBindings(this);
        }
        this.init();
    }

    function initBindings( instance ) {

        var eventSelector, handler;

        for( eventSelector in instance.bindings ) {
            handler = instance[ instance.bindings[ eventSelector ] ];
            if ( typeof handler !== 'function' ) {
                continue;
            }
            handler = bind( handler, instance );
            instance.listen( eventSelector, handler );
        }

    }

    var delegates = [];

    function getDelegate( node, event, selector, handler ){
        var index = delegates.length;
        var record;
        while( index-- ) {
            record = delegates[ index ];
            if ( record[0] === node
                 && record[1] === event
                 && record[2] === selector
                 && record[3] === handler ) {
                return record[4];
            }
        }
    }

    function delegate( node, event, selector, handler ){
        var delegateHandler = getDelegate( node, event, selector, handler );
        if ( delegateHandler ) {
            removeListener( node, event, delegateHandler );
            addListener( node, event, delegateHandler );
        } else {
            delegateHandler = function( e ){
                if ( matches( e.target||e.srcElement, selector ) ) {
                    handler( e );
                }
            }
            delegates.push([ node, event, selector, handler, delegateHandler ]);
        }
        addListener( node, event, delegateHandler, true);
    }

    function undelegate( node, event, selector, handler ){
        var delegateHandler = getDelegate( node, event, selector, handler );
        if ( delegateHandler ) {
            removeListener( node, event, delegateHandler );
        }
    }

    var addListener = 'addEventListener' in root ? function( node, event, listener ){
        node.addEventListener( event, listener, true );
    } : 'attachEvent' in root ? function( node, event, listener ){
        node.attachEvent( 'on' + event, listener );
    } : function(){
        // no support
    }

    var removeListener = 'removeEventListener' in root ? function( node, event, listener ){
        node.removeEventListener( event, listener, true );
    } : 'detachEvent' in root ? function( node, event, listener ){
        node.detachEvent( 'on' + event, listener );
    } : function(){
        // no support
    }

    var matches = 'matches' in root ? function( node, selector ){
        return node.matches( selector );
    } : 'webkitMatchesSelector' in root ? function( node, selector ){
        return node.webkitMatchesSelector( selector );
    } : 'mozMatchesSelector' in root ? function( node, selector ){
        return node.mozMatchesSelector( selector );
    } : 'msMatchesSelector' in root ? function( node, selector ){
        return node.msMatchesSelector( selector );
    } : 'webkitMatchesSelector' in root ? function( node, selector ){
        return node.webkitMatchesSelector( selector );
    } : 'oMatchesSelector' in root ? function( node, selector ){
        return node.oMatchesSelector( selector );
    } : 'querySelectorAll' in root ? function( node, selector ){
        var candidates = root.querySelectorAll( selector );
        var index = candidates.length;
        while( index-- ) {
            if ( candidates[ index ] === node ) {
                return true;
            }
        }
        return false;
    } : function(){
        // no support
    };

    function notify( node, event, data ){
        var event = createEvent( event );
        event.data = data;
        dispatchEvent( node, event );
    }

    var createEvent = 'Event' in global && 'MouseEvent' in global ? function( eventType ){
        return new Event( eventType );
    } : 'createEvent' in doc ? function( eventType ){
        var event = doc.createEvent( 'Event' );
        event.initEvent( eventType, true, true );
        return event;
    } : 'createEventObject' in doc ? function( eventType ){
        var event = doc.createEventObject();
        event.type = eventType;
        return event;
    } : function(){
        // no support
    }

    var dispatchEvent = 'dispatchEvent' in doc ? function( node, event ){
        node.dispatchEvent( event );
    } : 'fireEvent' in doc ? function( node, event ){
        node.fireEvent( 'on' + event.type, event );
    } : function(){

    };

    function clone( object ){
        function Constructor(){}
        Constructor.prototype = object;
        return new Constructor();
    }


    function mixin( receiver, provider ){
        var property;
        for( property in provider ) {
            receiver[ property ] = provider[ property ];
        }
        return receiver;
    }

    function bind( func, object ){
        var bound = function(){
            return func.apply( object, arguments );
        }
        bound.applies = func;
        return bound;
    }

    function amd(){
        return Graft;
    }

    if ( 'define' in window ) {
        define( amd );
        define( 'graft', amd );
    }

}(this,document));
