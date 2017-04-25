

// my-serializer-module
module.exports = {
  print(val, serialize, indent) {
    return 'Pretty foo: ' + serialize(val.foo);
  },

  test(val) {
    return val && val.hasOwnProperty('foo');
  },

};
