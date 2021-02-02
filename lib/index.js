'use strict';

import { NacosConfigClient, NacosNamingClient } from 'nacos';
import iptable from './ip'
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
          this.createClient(item, app.$config)
        })
      } else if (typeof config.client === 'object') {
        this.createClient(config.client, app.$config)
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
    this.getConfigAsync('test').then((res) => {
      console.log('getConfigAsync', res)
    })
  }
  async createClient (opt, config) {
    const name = opt.name || 'default'
    const client = new NacosNamingClient({
      logger: opt.logger || logger,
      serverList: opt.serverList,
      namespace: opt.namespace
    })
    await client.ready();
    await client.registerInstance(opt.serviceName || 'nodejs.domain', {
      ip: opt.instance?.ip || (iptable && iptable.extranet && iptable.extranet.length && iptable.extranet[0]) || '127.0.0.1',
      port: opt.instance?.port || config.port || '',
    })
    this.clientMap[name] = client
  }
  async createConfig (opt) {
    const name = opt.name || 'default'
    const configClient = new NacosConfigClient(opt);
    this.configClientMap[name] = configClient
  }
  subscribe (serviceName, callback, name) {
    const client = this.getClient(name)
    client.subscribe(serviceName, callback);
  }
  async deregisterAsync (serviceName, instance) {
    return await client.deregisterInstance(serviceName, instance);
  }
  getClient (name) {
    return this.clientMap[name || 'default']
  }
  getConfigClient (name) {
    return this.configClientMap[name || 'default']
  }
  async getConfigAsync (dataId, group = 'DEFAULT_GROUP', opt = {cache: true}) {
    // TODO assert
    if (!dataId) console.error('dataId is required')
    let config = this.configMap[group]?.[dataId]
    if (!config || cache === false) {
      config = await this.getConfigClient(opt.name).getConfig(dataId, group);
      console.log('this.getConfigClient(opt.name).getConfig(dataId, group)', dataId, group)
      const groupConfig = this.configMap[group] || {}
      groupConfig[dataId] = config
      this.configMap[group] = groupConfig
    }
    return config
  }
}

export default function (...arg) {
  return new Nacos(...arg)
}
