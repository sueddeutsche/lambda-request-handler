import zlib from 'zlib';
import app from './app';
import lambda from '../src/lambda';

import event from './fixtures/event.json';

const handler = lambda(app);

describe('integration', () => {
  it('returns static file', () => {
    const myEvent = {
      path: "/static/file.png",
      httpMethod: "GET",
      headers: {},
      queryStringParameters: {},
      isBase64Encoded: false,
      body: null
    }
    return handler(myEvent).then(response => {
      expect(response.statusCode).toEqual(200);
      expect(response.isBase64Encoded).toEqual(true);
      expect(response.headers["content-type"]).toEqual('image/png');
      expect(response.headers["content-length"]).toEqual('178');
    });
  });

  it('returns set-cookie header with different case', () => {
    const myEvent = {
      path: "/cookies",
      httpMethod: "GET",
      headers: {},
      queryStringParameters: {},
      isBase64Encoded: false,
      body: null
    }
    return handler(myEvent).then(response => {
      expect(response.headers).toEqual(expect.objectContaining({
        'set-cookie': 'chocolate=10; Path=/',
        'Set-cookie': 'peanut_butter=20; Path=/',
        'sEt-cookie': 'cinnamon=30; Path=/',
      }));
    });
  });

  it('returns 404 is static file is missing', () => {
    const myEvent = {
      path: "/static/missing.png",
      httpMethod: "GET",
      headers: {},
      queryStringParameters: {},
      isBase64Encoded: false,
      body: null
    }
    return handler(myEvent).then(response => {
      expect(response.statusCode).toEqual(404);
      expect(response.isBase64Encoded).toEqual(false);
      expect(response.headers["content-type"]).toEqual('text/html; charset=utf-8');
    });
  });

  it('handles POST requests with body', () => {
    const myEvent = {
      path: "/reflect",
      httpMethod: "POST",
      headers: {'content-type': 'application/json'},
      queryStringParameters: {},
      isBase64Encoded: false,
      body: JSON.stringify({hello: 'world'})
    }
    return handler(myEvent).then(response => {
      expect(response.statusCode).toEqual(200);
      expect(response.isBase64Encoded).toEqual(false);
      const json = JSON.parse(response.body);
      expect(json.body).toEqual({hello: 'world'})
    });
  });

  it('renders ejs template', () => {
    const myEvent = {
      path: "/render",
      httpMethod: "GET",
      headers: {},
      queryStringParameters: {},
      isBase64Encoded: false,
      body: null
    }
    return handler(myEvent).then(response => {
      expect(response.statusCode).toEqual(200);
      expect(response.isBase64Encoded).toEqual(false);
      expect(response.body).toMatch(/^<!DOCTYPE html>/);
      expect(response.headers["content-type"]).toEqual('text/html; charset=utf-8');
      expect(response.headers["content-length"]).toEqual('119');
    });
  });

  it('handles API GW event', () => {
    return handler(event).then(response => {
      expect(response.statusCode).toEqual(200);
      expect(response.isBase64Encoded).toEqual(false);
      expect(response.headers["content-type"]).toEqual('application/json; charset=utf-8');
      expect(response.headers["x-powered-by"]).toEqual('Express');
      const json = JSON.parse(response.body);
      expect(json).toEqual({
        baseUrl: "",
        body: {},
        cookies: {
          s_fid: "39BE527E3767FB80-174D965C9E0459D6",
          utag_main: "v_id:016460035de500182b7d0eaa1b650307800430700093c$_sn:2$_ss:1$_st:1542333456244$ses_id:1542331656244;exp-session$_pn:1;exp-session",
        },
        fresh: false,
        hostname: "apiid.execute-api.ap-southeast-2.amazonaws.com",
        ip: "203.13.23.10",
        ips: [],
        method: "GET",
        originalUrl: "/reflect",
        params: {},
        path: "/reflect",
        protocol: "https",
        query: {},
        secure: true,
        signedCookies: {},
        stale: true,
        subdomains: [
          "ap-southeast-2",
          "execute-api",
          "apiid",
        ],
        url: "/reflect",
        xForwardedFor: "203.13.23.10, 70.132.29.78",
        xhr: false,
      })
    })
  })

  it('handles routing with params', () => {
    const myEvent = {
      path: "/user/123",
      httpMethod: "GET",
      headers: {},
      queryStringParameters: {},
      isBase64Encoded: false,
      body: null
    }
    return handler(myEvent).then(response => {
      expect(response.statusCode).toEqual(200);
      expect(response.isBase64Encoded).toEqual(false);
      const json = JSON.parse(response.body);
      expect(json).toEqual({name: 'John', id: '123'})
    });
  });

  it('works with compressed response', () => {
    const myEvent = {
      path: "/static/big.html",
      httpMethod: "GET",
      headers: {
        'Accept-Encoding': 'gzip'
      },
      queryStringParameters: {},
      isBase64Encoded: false,
      body: null
    }

    const gunzip = (body: Buffer): Promise<Buffer> => new Promise((resolve, reject) => {
      zlib.gunzip(body, (error, data) => {
        if(error) {
          return reject(error);
        }
        resolve(data);
      });
    });

    return handler(myEvent).then(response => {
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-encoding']).toEqual('gzip');
      expect(response.headers['content-type']).toEqual('text/html; charset=UTF-8');
      expect(response.isBase64Encoded).toEqual(true);
      return gunzip(Buffer.from(response.body, 'base64'));
    })
    .then(body => {
      expect(body.toString()).toMatch(/^<!DOCTYPE html>/);
    });
  });

})
