'use strict';
const Sequelize = require('sequelize');
const key = require('./key.js');


var sequelize = new Sequelize(
    key.mysql.database,
    key.mysql.username,
    key.mysql.password,
    {
        host: key.mysql.host,
        dialect: key.mysql.dialect,
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        }
    });

const ID_TYPE = Sequelize.INTEGER;

function defineModel(name, attributes) {
    var attrs = {};
    for (let key in attributes) {
        let value = attributes[key];
        if (typeof value === 'object' && value['type']) {
            value.allowNull = value.allowNull || false;
            attrs[key] = value;
        } else {
            attrs[key] = {
                type: value,
                allowNull: false
            };
        }
    }
    attrs.id = {
        type: ID_TYPE,
        autoIncrement: true,
        primaryKey: true
    };
    attrs.createdAt = {
        type: Sequelize.BIGINT,
        allowNull: false
    };
    attrs.updatedAt = {
        type: Sequelize.BIGINT,
        allowNull: false
    };
    attrs.version = {
        type: Sequelize.BIGINT,
        allowNull: false
    };
    console.log('model defined for table: ' + name + '\n' + JSON.stringify(attrs, function (k, v) {
            if (k === 'type') {
                for (let key in Sequelize) {
                    if (key === 'ABSTRACT' || key === 'NUMBER') {
                        continue;
                    }
                    let dbType = Sequelize[key];
                    if (typeof dbType === 'function') {
                        if (v instanceof dbType) {
                            if (v._length) {
                                return `${dbType.key}(${v._length})`;
                            }
                            return dbType.key;
                        }
                        if (v === dbType) {
                            return dbType.key;
                        }
                    }
                }
            }
            return v;
        }, '  '));
    return sequelize.define(name, attrs, {
        tableName: name,
        timestamps: false,
        hooks: {
            beforeValidate: function (obj) {
                let now = Date.now();
                if (obj.isNewRecord) {
                    console.log('will create entity...');
                    obj.createdAt = now;
                    obj.updatedAt = now;
                    obj.version = 0;
                } else {
                    console.log('will update entity...');
                    obj.updatedAt = now;
                    obj.version++;
                }
            }
        }
    });
}

const TYPES = ['STRING', 'INTEGER', 'BIGINT', 'TEXT', 'DOUBLE', 'DATEONLY', 'BOOLEAN'];

var exp = {
    defineModel: defineModel,
    sync: () => {
        // only allow create ddl in non-production environment:
        if (process.env.NODE_ENV !== 'production') {
            // 强制创建
            // 通过设置 force 属性会首先删除表并重新创建
            sequelize.sync({force: false});
        } else {
            throw new Error('Cannot sync() when NODE_ENV is set to \'production\'.');
        }
    }
};

for (let type of TYPES) {
    exp[type] = Sequelize[type];
}

exp.ID = ID_TYPE;

module.exports = exp;
