function testReg(string){
  let i
  let startIndex ;
  let endIndex;
  let results = []
  function waitinForA(char){
    if(char === 'a'){
      startIndex = i
      return waitinForB
    }
    return waitinForA
  }
  function waitinForB(char){
    if(char === 'b' || char === 'd' ){
      return waitinForC
    }
    return waitinForA
  }
  function waitinForC(char){
    if(char === 'c'){
      endIndex = i
      return end
    }
    return waitinForA
  }

  function end(){
    return end
  }

  let currentState= waitinForA

  for(i =0; i<string.length; i++){
    let nextState = currentState(string[i])
    currentState = nextState
    if(currentState === end){
      console.log(startIndex, endIndex);
      results.push({
        start: startIndex,
        end: endIndex
      })
      currentState = waitinForA
    }
  }
  return false
}
// /abc/.test("")
// /a[bd]c/.test("")
console.log( testReg('abbabcbbadc'));