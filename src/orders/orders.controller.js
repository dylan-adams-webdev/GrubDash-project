const path = require('path');

// Use the existing order data
const orders = require(path.resolve('src/data/orders-data'));

// Use this function to assigh ID's when necessary
const nextId = require('../utils/nextId');

const list = (req, res) => {
	res.json({ data: orders });
};

const bodyContainsProp = (propertyName) => {
	return (req, res, next) => {
		const { data = {} } = req.body;
		if (data[propertyName]) {
			return next();
		}
		next({
			status: 400,
			message: `Body must include ${propertyName} property`,
		});
	};
};

const propNotEmpty = (propertyName) => {
	return (req, res, next) => {
		const { data = {} } = req.body;
		if (data[propertyName] !== '') {
			return next();
		}
		next({
			status: 400,
			message: `${propertyName} value must not be empty`,
		});
	};
};

const containsValidItemList = (req, res, next) => {
	const { data: { dishes } = {} } = req.body;
	if (Array.isArray(dishes) && dishes.length) return next();
	next({ status: 400, message: 'Order must contain at least one dish' });
};

const itemListContainsPosIntegerQuantities = (req, res, next) => {
	const { data: { dishes } = {} } = req.body;
	for (let i = 0; i < dishes.length; ++i) {
		if (
			!Object.keys(dishes[i]).includes('quantity') ||
			dishes[i].quantity < 1 ||
			!Number.isInteger(dishes[i].quantity)
		) {
			return next({
				status: 400,
				message: `dish ${i} quantity must be a positive integer`,
			});
		}
	}
	next();
};

const create = (req, res) => {
	const { data } = req.body;
	const newOrder = { id: nextId(), ...data };
	orders.push(newOrder);
	res.status(201).json({ data: newOrder });
};

const findOrderById = (req, res, next) => {
	const { orderId } = req.params;
	const foundOrder = orders.find((order) => order.id === orderId);
	if (foundOrder) {
		res.locals.order = foundOrder;
		next();
	}
	next({ status: 404, message: `No order found with id ${orderId}` });
};

const read = (req, res) => {
	res.json({ data: res.locals.order });
};

const validStatus = (req, res, next) => {
	const { data: { status } = {} } = req.body;
	const validStatus = [
		'pending',
		'preparing',
		'out-for-delivery',
		'delivered',
	];
	if (status && validStatus.includes(status)) return next();
	next({
		status: 400,
		message:
			'Order must have status of pending, preparing, out-for-delivery, delivered',
	});
};

const existingOrderNotDelivered = (req, res, next) => {
	const { status } = res.locals.order;
	if (status !== 'delivered') return next();
	next({
		status: 400,
		message: 'A delivered order cannot be changed',
	});
};

const urlIdMatchesBodyId = (req, res, next) => {
	const { orderId } = req.params;
	const { data: { id } = {} } = req.body;
	if (!id || orderId === id) return next();
	next({
		status: 400,
		message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
	});
};

const update = (req, res) => {
	const { order } = res.locals;
	const { data = {} } = req.body;
	order.deliverTo = data.deliverTo;
	order.mobileNumber = data.mobileNumber;
	order.status = data.status;
	order.dishes = data.dishes;
	res.json({ data: order });
};

const orderIsPending = (req, res, next) => {
	const { status } = res.locals.order;
	if (status === 'pending') return next();
	next({
		status: 400,
		message: 'An order cannot be deleted unless it is pending',
	});
};

const destroy = (req, res) => {
	const deleted = orders.splice(orders.indexOf(res.locals.order), 1);
	res.sendStatus(204);
};

module.exports = {
	list,
	create: [
		bodyContainsProp('deliverTo'),
		bodyContainsProp('mobileNumber'),
		bodyContainsProp('dishes'),
		propNotEmpty('deliverTo'),
		propNotEmpty('mobileNumber'),
		containsValidItemList,
		itemListContainsPosIntegerQuantities,
		create,
	],
	read: [findOrderById, read],
	update: [
		findOrderById,
		bodyContainsProp('deliverTo'),
		bodyContainsProp('mobileNumber'),
		bodyContainsProp('dishes'),
		propNotEmpty('deliverTo'),
		propNotEmpty('mobileNumber'),
		containsValidItemList,
		itemListContainsPosIntegerQuantities,
		urlIdMatchesBodyId,
		validStatus,
		existingOrderNotDelivered,
		update,
	],
	delete: [findOrderById, orderIsPending, destroy],
};
