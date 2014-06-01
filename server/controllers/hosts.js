/**
 * API controller for Hosts.
 */
var db = require('../models');
var Sequelize = require('sequelize');
var updatableAttributes = ['farmName', 'shortDescription', 'fullDescription', 'webSite', 'travelDetails', 'userId', 'addressId'];

/**
 * Returns a paginated list of hosts.
 * This route can be accessed from non authenticated users, but returns additional data for members (TODO).
 */
exports.index = function (req, res) {

    // Extract query params
    var limit = isNaN(parseInt(req.query.limit)) ? 20 : parseInt(req.query.limit),
        offset = isNaN(parseInt(req.query.offset)) ? 0 : parseInt(req.query.offset),
        dptCondition = req.query.dpt ? { id: req.query.dpt } : null,
        searchTerm = req.query.searchTerm || '';

    // Prepare host where condition
    var hostWhere = {};
    if (req.query.userId) {
        hostWhere.userId = req.query.userId;
    }
    if (!req.user || !req.user.isAdmin) {
        hostWhere.isPending = false;
    } else if (req.query.pendingOnly === 'true') {
        // Only admins can view pending hosts
        hostWhere.isPending = true;
    }

    // Find all hosts matching parameters
    db.Host.findAndCountAll({
        limit: limit,
        offset: offset,
        where: hostWhere,
        include: [
            {
                model: db.User,
                as: 'user',
                where: Sequelize.or(
                    ['firstName like ?', '%' + searchTerm + '%'],
                    ['lastName like ?', '%' + searchTerm + '%']
                )
            },
            {
                model: db.Address,
                as: 'address',
                include: [
                    {
                        model: db.Department,
                        where: dptCondition
                    }
                ]
            },
            {
                model: db.Photo,
                as: 'photos'
            }
        ]
    }).success(function (hosts) {
        res.send({
            hosts: hosts.rows,
            meta: {
                offset: offset,
                limit: limit,
                total: hosts.count
            }
        });
    });
};

/**
 * Returns a single host.
 */
exports.single = function (req, res) {
    db.Host.find({
        include: [
            { model: db.Photo, as: 'photos' },
            { model: db.User, as: 'user' },
            { model: db.Address, as: 'address' }
        ],
        where: { id: req.params.id }
    }).success(function (host) {
        // Returns host or 404 if not found
        if (host) {
            res.send({ host: host });
        } else {
            res.send(404);
        }
    }).error(function (error) {
        res.send(500, error);
    });
};

/**
 * Updates a host.
 */
exports.update = function (req, res) {

    // Validate input
    if (!req.body.host) {
        res.send(400);
        return;
    }

    // Find the original host
    db.Host.find({
        where: {
            id: req.params.id,
            userId: req.user.id
        }
    }).success(function (host) {
        if (host) {
            // Update the host
            host.updateAttributes(
                req.body.host,
                updatableAttributes
            ).success(function (host) {
                    res.send({ host: host });
                }).error(function (error) {
                    res.send(500, error);
                })
        } else {
            res.send(404);
        }
    }).error(function (error) {
        res.send(500, error);
    });
};

/**
 * Creates a host.
 */
exports.create = function (req, res) {

    // Validate input
    if (!req.body.host) {
        res.send(400);
        return;
    }

    // Make sure the current user does not have a host yet
    db.Host.find({
        where: { userId: req.user.id }
    }).then(function (host) {
        if (host) {
            // Existing host found for this user
            res.send(409);
        } else {
            // Set the user id
            req.body.host.userId = req.user.id;
            req.body.host.isPending = true;
            req.body.host.isSuspended = false;

            // Make isPending updatable
            var attributes = updatableAttributes.concat(['isPending', 'isSuspended']);

            // Create the host
            return db.Host.create(
                req.body.host,
                attributes
            );
        }
    }).then(function (host) {
        res.send({ host: host });
    }, function (error) {
        res.send(500, error);
    });
};