const path = require('path');
const { runInNewContext, runInThisContext } = require('vm');
const dishesData = require('../data/dishes-data');

// Use the existing dishes data
const dishes = require(path.resolve('src/data/dishes-data'));

// Use this function to assign ID's when necessary
const nextId = require('../utils/nextId');

const list = (req, res) => {
	res.json({ data: dishes });
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

const propPositiveInteger = (propertyName) => {
	return (req, res, next) => {
		const { data = {} } = req.body;
		if (Number.isInteger(data[propertyName]) && data[propertyName] > 0) {
			return next();
		}
		next({
			status: 400,
			message: `${propertyName} value must be positive integer`,
		});
	};
};

const create = (req, res, next) => {
	const { data = {} } = req.body;
	const newDish = { id: nextId(), ...data };
	dishesData.push(newDish);
	res.status(201).json({ data: newDish });
};

const bodyIdMatchesParamId = (req, res, next) => {
	const { data: { id } = {} } = req.body;
	if (!id || id === req.params.dishId) return next();
	next({
		status: 400,
		message: `Url includes id ${req.params.dishId} which does not match id ${id} included in request body`,
	});
};

const findItem = (req, res, next) => {
	const { dishId } = req.params;
	const foundDish = dishesData.find((dish) => dish.id === dishId);
	if (foundDish) {
		res.locals.dish = foundDish;
		return next();
	}
	next({ status: 404, message: `Item does not exist with id ${dishId}` });
};

const read = (req, res) => {
	res.json({ data: res.locals.dish });
};

const update = (req, res) => {
	const dish = res.locals.dish;
	const { data } = req.body;
	dish.name = data.name;
	dish.description = data.description;
	dish.price = data.price;
	dish.imageUrl = data.imageUrl;
	res.json({ data: dish });
};

module.exports = {
	list,
	create: [
		bodyContainsProp('name'),
		bodyContainsProp('description'),
		bodyContainsProp('price'),
		bodyContainsProp('image_url'),
		propNotEmpty('name'),
		propNotEmpty('description'),
		propNotEmpty('imageUrl'),
		propPositiveInteger('price'),
		create,
	],
	read: [findItem, read],
	update: [
		findItem,
		bodyIdMatchesParamId,
		bodyContainsProp('name'),
		bodyContainsProp('description'),
		bodyContainsProp('price'),
		bodyContainsProp('image_url'),
		propNotEmpty('name'),
		propNotEmpty('description'),
		propNotEmpty('imageUrl'),
		propPositiveInteger('price'),
		update,
	],
};
