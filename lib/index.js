'use strict';

import { NacosConfigClient, NacosNamingClient } from 'nacos';
// import iptable from './ip'
const logger = console;

const CONTEXT_NACOS = Symbol('context#nacos')

class Nacos {
  constructor (opt) {
    this.name = 'nacos'
    this.isLono = true
    this.opt = opt
    this.clientMap = {}
    // 配置连接
    this.configClientMap = {}
    // 配置缓存
    this.configMap = {}
  }
  install (app) {
    if (app.context.hasOwnProperty(CONTEXT_NACOS)) return
    const config = app.$config.nacos || this.opt
    if (config && config.client) {
      if (Array.isArray(config.client)) {
        config.client.forEach((item) => {
          this.createClient(item)
        })
      } else if (typeof config.client === 'object') {
        this.createClient(config.client)
      }
    }
    if (config && config.config) {
      if (Array.isArray(config.config)) {
        config.config.forEach((item) => {
          this.createConfig(item)
        })
      } else if (typeof config.config === 'object') {
        this.createConfig(config.config)
      }
    }
    Object.defineProperties(app.context, {
      [CONTEXT_NACOS]: {
        value: this,
        writable: false
      },
      'nacos': {
        value: this,
        writable: false
      }
    })
  }
  async createClient (opt) {
    const name = opt.name || 'default'
    const client = new NacosNamingClient({
      logger: opt.logger || logger,
      serverList: opt.serverList,
      namespace: opt.namespace
    })
    await client.ready();
    await client.registerInstance(opt.serviceName || 'nodejs.domain', {
      // ip: opt.instance.ip || (iptable && iptable.extranet && iptable.extranet.length && iptable.extranet[0]) || '127.0.0.1',
      ip: opt.instance.ip || '127.0.0.1',
      port: opt.instance.port,
    })

    this.clientMap[name] = client
  }
  async createConfig (opt) {
    const name = opt.name || 'default'
    const configClient = new NacosConfigClient(opt);
    this.configClientMap[name] = configClient
  }
  async createSubscribe () {
  }
  getClient (name) {
    return this.clientMap[name || 'default']
  }
  getConfigClient (name) {
    return this.configClientMap[name || 'default']
  }
  async getConfigAsync (dataId, group = 'DEFAULT_GROUP', cache = true) {
    // TODO assert
    if (!dataId) console.error('dataId is required')
    let config = this.configMap[group]?.[dataId]
    if (!config || cache === false) {
      config = await configClient.getConfig(dataId, group);
      const groupConfig = this.configMap[group] || {}
      groupConfig[id] = config
      this.configMap[group] = groupConfig
    }
    return config
  }
}

// // subscribe instance
// client.subscribe(serviceName, hosts => {
//   console.log(hosts);
// });

// // deregister instance
// await client.deregisterInstance(serviceName, {
//   ip: '1.1.1.1',
//   port: 8080,
// });

export default function (...arg) {
  return new Nacos(...arg)
}
