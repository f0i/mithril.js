describe("m.request()", function () {
	"use strict"

	// Much easier to read
	function resolve() {
		var xhr = mock.XMLHttpRequest.$instances.pop()
		xhr.onreadystatechange()
		return xhr
	}

	// Common abstraction: request(opts, ...callbacks)
	function request(opts) {
		var ret = m.request(opts)
		for (var i = 0; i < arguments.length; i++) {
			ret = ret.then(arguments[i])
		}
		resolve()
		return ret
	}

	it("sets the correct properties on `GET`", function () {
		var prop = request({
			method: "GET",
			url: "test"
		})

		expect(prop()).to.contain.keys({
			method: "GET",
			url: "test"
		})
	})

	it("returns a Mithril promise (1)", function () {
		var prop = request(
			{method: "GET", url: "test"},
			function () { return "foo" })

		expect(prop()).to.equal("foo")
	})

	it("returns a Mithril promise (2)", function () {
		var prop = request({method: "GET", url: "test"})
		var result = prop()

		expect(prop.then(function (value) { return value })()).to.equal(result)
	})

	it("sets the correct properties on `POST`", function () {
		var prop = request({
			method: "POST",
			url: "http://domain.com:80",
			data: {}
		})

		expect(prop()).to.contain.keys({
			method: "POST",
			url: "http://domain.com:80"
		})
	})

	it("sets the correct arguments", function () {
		expect(request({
			method: "POST",
			url: "http://domain.com:80/:test1",
			data: {test1: "foo"}
		})().url).to.equal("http://domain.com:80/foo")
	})

	it("propogates errors through the promise (1)", function () {
		var error = m.prop()

		var prop = m.request({
			method: "GET",
			url: "test",
			deserialize: function () { throw new Error("error occurred") }
		}).then(null, error)
		resolve()

		expect(prop().message).to.equal("error occurred")
		expect(error().message).to.equal("error occurred")
	})

	it("propogates errors through the promise (2)", function () {
		var error = m.prop()

		var prop = m.request({
			method: "GET",
			url: "test",
			deserialize: function () { throw new Error("error occurred") }
		}).catch(error)
		resolve()

		expect(prop().message).to.equal("error occurred")
		expect(error().message).to.equal("error occurred")
	})

	it("does not propogate results to `finally`", function () {
		// Data returned by then() functions do *not* propagate to finally().
		var data = m.prop()
		var prop = m.request({
			method: "GET",
			url: "test"
		})
		.then(function () { return "foo" })
		.finally(data)

		resolve()

		expect(prop()).to.equal("foo")
		expect(data()).to.not.exist
	})

	it("does not propogate `finally` results to the next promise", function () {
		var data = m.prop()

		var prop = m.request({method: "GET", url: "test"})
		.then(function () { return "foo" })
		.finally(function () { return "bar" })
		.then(data)
		resolve()

		expect(prop()).to.equal("foo")
		expect(data()).to.equal("foo")
	})

	it("propogates `finally` errors", function () {
		var error = m.prop()

		var prop = m.request({method: "GET", url: "test"})
		.then(function () { return "foo" })
		.finally(function () { throw new Error("error occurred") })
		.catch(error)

		resolve()
		expect(prop().message).to.equal("error occurred")
		expect(error().message).to.equal("error occurred")
	})

	it("runs successive `finally` after `catch`", function () {
		var error = m.prop()

		var prop = m.request({
			method: "GET",
			url: "test",
			deserialize: function () { throw new Error("error occurred") }
		})
		.catch(error)
		.finally(function () { error("finally") })

		resolve()
		expect(prop().message).to.equal("error occurred")
		expect(error()).to.equal("finally")
	})

	it("synchronously throws TypeErrors", function () {
		var error = m.prop()
		var exception
		var prop = m.request({
			method: "GET",
			url: "test",
			deserialize: function () { throw new TypeError("error occurred") }
		}).then(null, error)

		try {
			resolve()
		} catch (e) {
			exception = e
		}

		expect(prop()).to.not.exist
		expect(error()).to.not.exist
		expect(exception.message).to.equal("error occurred")
	})

	it("sets correct Content-Type when given data", function () {
		var error = m.prop()

		m.request({
			method: "POST",
			url: "test",
			data: {foo: 1}
		}).then(null, error)

		var xhr = mock.XMLHttpRequest.$instances.pop()
		xhr.onreadystatechange()

		expect(xhr.$headers).to.have.property(
			"Content-Type",
			"application/json; charset=utf-8")
	})

	it("doesn't set Content-Type when it doesn't have data", function () {
		var error = m.prop()

		m.request({
			method: "POST",
			url: "test"
		}).then(null, error)

		var xhr = mock.XMLHttpRequest.$instances.pop()
		xhr.onreadystatechange()

		expect(xhr.$headers).to.not.have.property("Content-Type")
	})

	it("correctly sets initial value", function () {
		var prop = m.request({
			method: "POST",
			url: "test",
			initialValue: "foo"
		})

		var initialValue = prop()
		resolve()

		expect(initialValue).to.equal("foo")
	})

	it("correctly propogates initial value when not completed", function () {
		var prop = m.request({
			method: "POST",
			url: "test",
			initialValue: "foo"
		}).then(function (value) { return value })

		var initialValue = prop()
		resolve()

		expect(initialValue).to.equal("foo")
	})

	it("resolves `then` correctly with an initialValue", function () {
		var prop = m.request({
			method: "POST",
			url: "test",
			initialValue: "foo"
		}).then(function () { return "bar" })

		resolve()
		expect(prop()).to.equal("bar")
	})

	it("appends query strings to `url` from `data` for `GET`", function () {
		var prop = m.request({method: "GET", url: "/test", data: {foo: 1}})
		resolve()
		expect(prop().url).to.equal("/test?foo=1")
	})

	it("doesn't append query strings to `url` from `data` for `POST`", function () { // eslint-disable-line
		var prop = m.request({method: "POST", url: "/test", data: {foo: 1}})
		resolve()
		expect(prop().url).to.equal("/test")
	})

	it("appends children in query strings to `url` from `data` for `GET`", function () { // eslint-disable-line
		var prop = m.request({method: "GET", url: "test", data: {foo: [1, 2]}})
		resolve()
		expect(prop().url).to.equal("test?foo=1&foo=2")
	})

	it("propogates initial value in call before request is completed", function () { // eslint-disable-line
		var value
		var prop1 = m.request({method: "GET", url: "test", initialValue: 123})
		expect(prop1()).to.equal(123)
		var prop2 = prop1.then(function () { return 1 })
		expect(prop2()).to.equal(123)
		var prop3 = prop1.then(function (v) { value = v })
		expect(prop3()).to.equal(123)
		resolve()

		expect(value.method).to.equal("GET")
		expect(value.url).to.equal("test")
	})

	context("over jsonp", function () {
		/* eslint-disable no-invalid-this */
		beforeEach(function () {
			var body = this.body = mock.document.createElement("body")
			mock.document.body = body
			mock.document.appendChild(body)
		})

		afterEach(function () {
			mock.document.removeChild(this.body)
		})
		/* eslint-enable no-invalid-this */

		function request(data, callbackKey) {
			return m.request({
				url: "/test",
				dataType: "jsonp",
				data: data,
				callbackKey: callbackKey
			})
		}

		function find(list, item, prop) {
			var res
			for (var i = 0; i < list.length; i++) {
				var entry = list[i]
				if (prop != null) entry = entry[prop]
				if (entry.indexOf(item) >= 0) res = entry
			}
			return res
		}

		function resolve(data) {
			var callback = find(Object.keys(mock), "mithril_callback")
			var url = find(mock.document.getElementsByTagName("script"),
				callback, "src")
			mock[callback](data)
			return url
		}

		it("sets the `GET` url with the correct query parameters", function () {
			request({foo: "bar"})
			expect(resolve({foo: "bar"})).to.contain("foo=bar")
		})

		it("correctly gets the value, without appending the script on the document", function () { // eslint-disable-line
			var data = m.prop()

			request().then(data)

			var url = resolve({foo: "bar"})

			expect(url).to.contain("/test?callback=mithril_callback")
			expect(data()).to.eql({foo: "bar"})
		})

		it("correctly gets the value with a custom `callbackKey`, without appending the script on the document", function () { // eslint-disable-line
			var data = m.prop()

			request(null, "jsonpCallback").then(data)

			var url = resolve({foo: "bar1"})

			expect(url).to.contain("/test?jsonpCallback=mithril_callback")
			expect(data()).to.eql({foo: "bar1"})
		})

		it("correctly gets the value on calling the function", function () {
			var req = request()
			resolve({foo: "bar1"})
			expect(req()).to.eql({foo: "bar1"})
		})
	})
})
