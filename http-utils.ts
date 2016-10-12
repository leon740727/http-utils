/// <reference path="../d/node.d.ts"/>

import * as http from "http";
import * as https from "https";
import {Optional, Result} from "./types";

export class Url {
    static re = /^(\w+:\/\/)?([^\/:]+)(:\d+)?(.+)?/;
    private static parse(url: string) {
        return Optional.of(url.match(Url.re));
    }
    private static part(index: number): (match: RegExpMatchArray) => Optional<string> {
        return match => Optional.of(match[index]);
    }
    static protocol(url: string): Optional<string> {
        return Url.parse(url).chain(Url.part(1)).map(text => text.slice(0, -3));
    }
    static host(url: string): Optional<string> {
        return Url.parse(url).chain(Url.part(2));
    }
    static port(url: string): Optional<number> {
        return Url.parse(url).chain(Url.part(3)).map(text => parseInt(text.slice(1)));
    }
    static path(url: string): Optional<string> {
        return Url.parse(url).chain(Url.part(4));
    }
}

export type Header = {[field: string]: string};

export type Response = {
    statusCode: number,
    header: Header,
    content: Buffer
};

export function request(method: string, url: string, header: Optional<Header>, body: Optional<Buffer>): Promise<Response> {
    let request = Url.protocol(url).or_else("http") == "http" ? http.request : https.request;
    return new Promise<Response>((resolve, reject) => {
        let req = request({
            method: method,
            hostname: Url.host(url).or_else(""),
            port: Url.port(url).or_else(request == http.request ? 80 : 443),
            path: Url.path(url).or_else(""),
            headers: header.or_else({})
        }, res => {
            let data: Buffer = new Buffer(0);
            res.on("data", d => data = Buffer.concat([data, d]));
            res.on("end", _ => {
                resolve({
                    statusCode: res.statusCode,
                    header: res.headers,
                    content: data
                });
            });
        });
        req.on("error", e => reject(e.message));
        if (body.is_present()) {
            body.map(body => {
                req.write(body);
                req.end();
            });
        } else {
            req.end();
        }
    });
}

export function post(url: string, body: Buffer, header: Optional<Header>): Promise<Response> {
    return request("POST", url, header, Optional.of(body));
}

export function get(url: string, header: Optional<Header>): Promise<Response> {
    return request("GET", url, header, Optional.empty());
}
