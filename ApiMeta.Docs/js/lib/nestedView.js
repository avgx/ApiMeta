﻿(function () {
    _ = this._ != null ? this._ : require('underscore');
    Backbone = this.Backbone != null ? this.Backbone : require('backbone');

    var server = this.window == null,
        noop = function () { };

    var NestedView = Backbone.View.extend({
        // Key for the template
        name: null,

        initialize: function () {
            this.childViews = {};
            this.postInitialize();
        },

        // To be overridden.
        postInitialize: noop,

        // Get data for template.  This also acts as a view-model.
        // Try to return proper data if model or collection is available.
        getTemplateData: function () {
            var data;
            if (this.model) {
                data = this.model.toJSON();
            } else if (this.collection) {
                data = { collection: this.collection.toJSON() };
            } else {
                data = _.clone(this.options);
            }
            return data;
        },

        decorateTemplateData: function (data) {
            data = _.clone(data);
            data._view = this;
            if (this.model) data._model = this.model;
            if (this.collection) data._collection = this.collection;
            return data;
        },

        // Get template function.
        // Override this in a base class and/or per-view.

        // Get HTML attributes to add to el.
        getAttributes: function () {
            var attributes = {};

            if (this.id) attributes.id = this.id;
            if (this.className) attributes['class'] = this.className;

            // Add `data-view` attribute with view key.
            // For now, view key is same as template.
            attributes['data-view'] = this.name;
            attributes['data-cid'] = this.cid;

            return attributes;
        },

        // Turn template into HTML. Override this to swap out the
        // content generated by the view.
        getInnerHtml: function () {
            var data, template;

            data = this.getTemplateData();
            data = this.decorateTemplateData(data);
            template = this.template;
            if (template == null) {
                throw new Error('Template for "' + this.name + '" not found.');
            }

            return template(data);
        },

        // Gets the outer HTML. Calls getInnerHtml().
        getHtml: function () {
            var html, attributes, attrString;


            html = this.getInnerHtml();

            attributes = this.getAttributes();
            attrString = _.reduce(attributes, function (memo, value, key) {
                return memo + [' ', key, '="', value, '"'].join('');
            }, '');
            html = ['<', this.tagName, attrString, '>', html, '</', this.tagName, '>'].join('');

            return html;
        },

        render: function () {
            var html = this.getInnerHtml();
            this.$el.html(html);
            this.$el.attr('data-view', this.name);
            this.attachChildViews();
            this._postRender();
            return this;
        },

        _postRender: function () {
            this.postRender();
        },

        // Anything to do after rendering on the client.
        // Noop, to be overridden by subclasses.
        postRender: noop,

        attach: function ($el) {
            $el.data('attached', true);
            this.setElement($el);
            this.attachChildViews();
            this._postRender();
        },

        // Gets called after rendering. We have an object containing
        // child views, but they're not attached to the DOM elements yet.
        attachChildViews: function () {
            var _this = this, $el;
            _.each(this.childViews, function (childView) {
                $el = _this.$('[data-cid="' + childView.cid + '"]');
                if ($el.data('attached') !== true) {
                    childView.attach($el);
                }
            });
        },

        registerChildView: function (childView, name) {
            this.childViews[name || childView.name] = childView;
        },

        getChildView: function (viewName) {
            return this.childViews[viewName];
        }
    });

    // Create noops for methods that touch DOM if running on server.
    if (server) {
        NestedView.prototype._ensureElement = noop;
        NestedView.prototype.delegateEvents = noop;
    }

    // Class methods.
    // ==============

    // Get the a view class based on its name.
    // You may want to override this based on your setup:
    // CommonJS vs require vs globals.
    NestedView.getView = function (name) {
        return require('./' + name);
    };

    // Handlebars/_.template helper
    // =================

    NestedView.viewHelper = function (context, options) {
        var viewName = context,
            viewOptions = options || {},
            View, view, parentView, html;

        // Allow passing in context with special 'context' key.
        if (viewOptions.context) {
            viewOptions = viewOptions.context;
        }

        // If no viewOptions are passed, let's just pass through the
        // current context untouched.
        if (_.isEmpty(viewOptions)) {
            viewOptions = _.clone(this);
        }

        View = NestedView.getView(viewName);
        view = new View(viewOptions);

        parentView = this._view;
        if (parentView) {
            parentView.registerChildView(view);
        }

        html = view.getHtml();
        return html; //new Handlebars.SafeString(html);
    };

    //NestedView.registerHandlebars = function (Handlebars) {
    //    Handlebars.registerHelper('view', NestedView.viewHelper);
    //};

    //NestedView.compileTemplate = function (source) {
    //    return Handlebars.compile(source);
    //};

    // Register the Handlebars helper
    //NestedView.registerHandlebars(Handlebars);

    // Export for CommonJS, Ender, or as a global.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = NestedView;
    } else if (this.provide) {
        provide('nested-view', NestedView);
    } else {
        this.NestedView = NestedView;
    }

}).call(this);