const once = f => {
  let result
  let run = false

  const onced = (...args) => {
    if (run) return result
    run = true
    return result = f(...args)
  }

  return onced
}

module.exports = once
