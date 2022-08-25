const queue: any[] = [];
let isFlushPending = false;
//和scheduler用同一个promise
let p = Promise.resolve();
export function nextTick(fn) {
  console.log("instance nexttick");

  return fn ? p.then(fn) : p;
}
export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  queueFlush();
}

function queueFlush() {
  //只创建一次Promise.resolve()就够了 用 isFlushPending 来判断
  if (isFlushPending) return;
  isFlushPending = true;
  nextTick(flushJobs);
}

function flushJobs() {
  let job;
  isFlushPending = false;
  while ((job = queue.shift())) {
    job();
  }
}
