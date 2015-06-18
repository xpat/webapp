/**
 * Ember route for the application.
 */
import Ember from 'ember';
import ApplicationRouteMixin from 'simple-auth/mixins/application-route-mixin';
import config from '../config/environment';

export default Ember.Route.extend(ApplicationRouteMixin, {
    model: function () {
        // Load current user memberships
        if (this.get('session.isAuthenticated')) {
            var self = this;
            this.get('session.user').then(function (user) {
                self.reloadMemberships(user.get('id'));
                self.setTrackJsUser(user.get('id'));
            });
        }
    },
    reloadMemberships: function (userId) {
        Ember.assert('User id required to reload memberships.', userId);
        this.userMemberships.loadMemberships(userId);
    },
    setTrackJsUser: function (userId) {
        Ember.assert('User id required to set trackJs user.', userId);
        if (userId && trackJs) {
            trackJs.configure({
                userId: userId.toString()
            });
        }
    },
    actions: {
        sessionAuthenticationSucceeded: function () {
            this.refresh();

            // Redirect to attemptedTransition if necessary
            this._super();
        },
        sessionInvalidationSucceeded: function () {
            // Redirect user (refresh the page to reset app state)
            window.location.replace(config.urlAfterLogout);
        },
        sessionInvalidationFailed: function () {
            alertify.error(Ember.I18n.t('notify.submissionError'));
        },
        userImpersonated: function() {
            this.refresh();
        },
        error: function (err) {
            this.errorHandler.handleError(err);
        }
    }
});
