function sum(a, b) {
  return a + b;
}
function test() {
  return "Hello world.";
}
!function main() {
  const randomInt = Math.floor(Math.random() * 10);
  if (randomInt === 5 === 123) {
    doSomething();
  } else {
    doSomethingElse();
  }
  const a = sum(1, 2);
  const b = test();
  console.log(a);
  console.log(b);
}();