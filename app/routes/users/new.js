/**
 * Ember route for user creation.
 */
import Ember from 'ember';
import UnauthenticatedRouteMixin from 'simple-auth/mixins/unauthenticated-route-mixin';

export default Ember.Route.extend(UnauthenticatedRouteMixin, {
    model: function () {
        return this.store.createRecord('user');
    },
    renderTemplate: function () {
        this.render('user/form', { controller: 'users.new' });
    }
});
