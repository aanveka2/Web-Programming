import assert from 'assert';
//import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import querystring from 'querystring';

import ModelError from './model-error.mjs';

//not all codes necessary
const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

const BASE = 'api';

export default function serve(port, meta, model) {
  const app = express();
  app.locals.port = port;
  app.locals.meta = meta;
  app.locals.model = model;
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}

function setupRoutes(app) {
  //app.use(cors());

  //pseudo-handlers used to set up defaults for req
  app.use(bodyParser.json());      //always parse request bodies as JSON
  app.use(reqSelfUrl, reqBaseUrl); //set useful properties in req

  //application routes
  app.get(`/${BASE}`, doBase(app));
  
  //@TODO: add other application routes
  app.post(`/${BASE}/carts`, doCreate(app));
  app.patch(`/${BASE}/carts/:id`, doUpdate(app));
  app.get(`/${BASE}/books/:id`, doGet(app));
  app.get(`/${BASE}/carts/:id`, doGetCart(app));
  app.get(`/${BASE}/books`, doGetBooks(app));
  //must be last
  app.use(do404(app));
  app.use(doErrors(app));
}

/****************************** Handlers *******************************/

/** Sets selfUrl property on req to complete URL of req,
 *  including query parameters.
 */
function reqSelfUrl(req, res, next) {
  const port = req.app.locals.port;
  req.selfUrl = `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
  next();  //absolutely essential
}

/** Sets baseUrl property on req to complete URL of BASE. */
function reqBaseUrl(req, res, next) {
  const port = req.app.locals.port;
  req.baseUrl = `${req.protocol}://${req.hostname}:${port}/${BASE}`;
  next(); //absolutely essential
}

function doBase(app) {
  return function(req, res) { 
    try {
      const links = [
	{ rel: 'self', name: 'self', href: req.selfUrl, },
  //@TODO add links for book and cart collections
    { rel: 'collection', name: 'books', href: req.selfUrl+"/books", },
    { rel: 'collection', name: 'carts', href: req.selfUrl+"/carts", }
      ];
      res.json({ links });
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

//@TODO: Add handlers for other application routes
function doCreate(app) {
  return errorWrap(async function (req, res) {
    try {
      //console.log(app);
      const obj = req.body;
      const results = await app.locals.model.newCart(obj);
      const location = req.selfUrl + '/'+ results;
      res.append('Location', location);
      res.status(CREATED); res.json({});
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doUpdate(app) {
  return errorWrap(async function (req, res) {
    try {          
      const cartId = req.params.id;
      const patch = Object.assign({},req.body,{cartId: cartId});
      const results = await app.locals.model.cartItem(patch);
      res.status(204);
      res.json({});
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doGet(app) {
  return errorWrap(async function (req, res) {
    try {
      
      const id = req.params.id;
      //console.log(id);
      const results = await app.locals.model.findBooks({isbn: id} );
      //console.log(results);
      const links = [{ rel: 'self', name : "self", href: req.selfUrl } ];
      if(results.length === 0){
          throw [ new ModelError('BAD_ID', `no book for isbn ${id}`, 'isbn'), ];
        // await do404(app);
      }
      else {
        const merge = Object.assign({},{links}, {results});
        res.json(merge);
      }
    }
    catch (err) {         
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doGetCart(app){
  return async function(req, res) {
    try {
      const cartId = req.params.id;
      const results = await app.locals.model.getCart({ cartId: cartId });
      const obj = {};
      if (results.length === 0) {
        throw [ new ModelError('BAD_ID', `no cart for id ${cartId}`, 'isbn'), ];
      }
      else {        
        obj._lastModified = results._lastModified;
        delete results._lastModified;
        obj.links = [ { rel: "self", name: "self", href: req.selfUrl, },];
        const items = [];
        for (const [key, value] of Object.entries(results)) {
          items.push({ links : [{ rel: 'item', name: 'book', href: req.baseUrl + `/books/${key}`, }],
            nUnits : value,
            sku : key
          })
        }
        obj.result = items;
        res.json(obj);
      }
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  };
}


function doGetBooks(app) {
  return async function(req, res){
    try {
      const query = req.query || {};
      const params = Object.assign({}, query, {_count: (+query._count || 5)+1});
      const count = Number(query._count || 5);
      const index = Number(query._index || 0);
      if(!query){
        throw [ new ModelError('FORM_ERROR', `At least one search field must be specified.`, ''), ];
      }
      const results = await app.locals.model.findBooks(params);
      const resCount = results.slice(0, params._count - 1);
      resCount.map(item => {item.links = [{rel: "details",name: "book",href: req.baseUrl + `/books/${item.isbn}`
          }
        ];
      });
      const data = {links : [{ rel: 'self', name: 'self', href: req.selfUrl }],
        result: resCount
      };
      if (index > 0) {
        let prevIndex = index - count;
        if (prevIndex < 0){
          prevIndex = 0;
        }
        const prevUrl = `${req.baseUrl}/books?${querystring.stringify(Object.assign({}, query, { _index: prevIndex }))}`;
        data.links.push({ rel: 'prev', href: prevUrl, name: 'prev' });
      }      
      const nextIndex = index + count;
      if (results.length === params._count) {
        const nextUrl = `${req.baseUrl}/books?${querystring.stringify(Object.assign({}, query, {_index: nextIndex }))}`;
        data.links.push({rel: 'next', href: nextUrl, name: 'next'});
      }
      res.json(data);
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  }
}


function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}





/** Default handler for when there is no route for a particular method
 *  and path.
 */
function do404(app) {
  return async function(req, res) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    const result = {
      status: NOT_FOUND,
      errors: [	{ code: 'NOT_FOUND', message, }, ],
    };
    res.type('text').
	status(404).
	json(result);
  };
}


/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    const result = {
      status: SERVER_ERROR,
      errors: [ { code: 'SERVER_ERROR', message: err.message } ],
    };
    res.status(SERVER_ERROR).json(result);
    console.error(err);
  };
}


/*************************** Mapping Errors ****************************/

const ERROR_MAP = {
  BAD_ID: NOT_FOUND,
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code and an errors property containing list of error objects
 *  with code, message and name properties.
 */
function mapError(err) {
  const isDomainError =
    (err instanceof Array && err.length > 0 && err[0] instanceof ModelError);
  const status =
    isDomainError ? (ERROR_MAP[err[0].code] || BAD_REQUEST) : SERVER_ERROR;
  const errors =
	isDomainError
	? err.map(e => ({ code: e.code, message: e.message, name: e.name }))
        : [ { code: 'SERVER_ERROR', message: err.toString(), } ];
  if (!isDomainError) console.error(err);
  return { status, errors };
} 

/****************************** Utilities ******************************/
