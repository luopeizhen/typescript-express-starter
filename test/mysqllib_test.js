const assert = require('assert');
const mysqllib = require('../dist/lib/mysqllib/mysqllib');

mysqllib.CreateDbConnection(mysqllib.DB_DEFAULT, 'localhost', 3306, 'root', "123", "test", 2)

describe('mysqllib', function() {
  describe.only('delete', function() {
    it('should return 0', async function() {
      let qb = new mysqllib.QueryBuilder('t1')
      await mysqllib.getDefDb().delete(qb)
      
      qb = new mysqllib.QueryBuilder('t1')
      qb.fields("count(*) as num")
      let totalCount = (await mysqllib.getDefDb().findOne(qb)).num;
      assert.equal(totalCount, 0);
    });
  });

  describe.only('insert', function() {
    it('should return 1', async () => {
      let qb = new mysqllib.QueryBuilder('t1')
      qb.add("name", "abc")
      qb.add("value", 1)
      await mysqllib.getDefDb().insert(qb)
      
      qb = new mysqllib.QueryBuilder('t1')
      qb.fields("count(*) as num")
      let totalCount = (await mysqllib.getDefDb().findOne(qb)).num;
      assert.equal(totalCount, 1);
    });
  });
  
  describe.only('commit', function() {
    it('should return 2', async () => {
      await mysqllib.getDefDb().beginTransaction()

      let qb = new mysqllib.QueryBuilder('t1')
      qb.where("name", "=", "abc")
      qb.set("value", 2)
      await mysqllib.getDefDb().update(qb)
      
      await mysqllib.getDefDb().commit()
      
      qb = new mysqllib.QueryBuilder('t1')
      qb.where("name", "=", "abc")
      let item = (await mysqllib.getDefDb().findOne(qb))
      assert.equal(item.value, 2);
    });
  });
  
  describe.only('rollback', function() {
    it('should return 2', async () => {
      await mysqllib.getDefDb().beginTransaction()

      let qb = new mysqllib.QueryBuilder('t1')
      qb.where("name", "=", "abc")
      qb.set("value", 3)
      await mysqllib.getDefDb().update(qb)
      
      console.log("before rollback")
      qb = new mysqllib.QueryBuilder('t1')
      qb.where("name", "=", "abc")
      let item = (await mysqllib.getDefDb().findOne(qb))
      console.log("item:", item)
      
      await mysqllib.getDefDb().rollback()
      
      console.log("after rollback")
      qb = new mysqllib.QueryBuilder('t1')
      qb.where("name", "=", "abc")
      item = (await mysqllib.getDefDb().findOne(qb))
      console.log("item:", item)
      assert.equal(item.value, 2);
    });
  });

});



