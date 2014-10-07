var foo = foo || {};
(function () {

    function Graft( node, config ){
        this.node = Graft.wrapNode( node );
    }

    Graft.prototype = {

        /**
         *
         */
        bindings: null,

        /**
         * Listen to events notified in the DOM or on the eventBus.
         * To listen to an eventBus event, prefix the event with 'bus:' for example; 'bus:update'
         *
         * @param {string} event Event string, can contain a namespace
         * @param {function|object} listener Either a function or an object with handleEvent method.
         */
        listen: function ( event, listener ) {}
        deafen: function ( event, listener ) {},
        notify: function ( event, data ) {}

    };

    Graft.sub = function( properties ){
        function Sub(){
            Graft.apply( this, arguments );
        }
        Sub.prototype = mixin( clone( this.Super.prototype ), properties );
        Sub.sub = this.Super.sub;
    };

    Graft.wrapNode = function( node ){
        return node;
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


    foo.Graft = Graft;

    if ( define ) {
        define('foo/graft',function(){
            return Graft;
        });
    }

}(this,document));
