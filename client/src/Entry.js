import {useHistory, useParams} from "react-router-dom"
import React, {useEffect, useState} from "react"
import {fetch_} from "./utils"
import _ from "lodash"
import {Accordion, Button, Card, Col, Form, Row} from "react-bootstrap"
import ReactMarkdown from "react-markdown"
import ReactStars from "react-stars"
import './Entry.css'

export default function Entry({jwt}) {
  const {entry_id} = useParams()
  const history = useHistory()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [fields, setFields] = useState([])
  const [fieldVals, setFieldVals] = useState({})

  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState('number')

  const fetchEntry = async () => {
    let res;

    res = await fetch_(`fields`, 'GET', null, jwt)
    setFields(res.fields)
    setFieldVals(_.zipObject(_.map(res.fields, 'id'))) // => {'a': undefined, 'b': undefined}

    if (!entry_id) { return }
    res = await fetch_(`entries/${entry_id}`, 'GET', null, jwt)
    setTitle(res.title)
    setText(res.text)
    setFieldVals(res.fields)
  }

  useEffect(() => {
    fetchEntry()
  }, [entry_id])

  const cancel = () => history.push('/j')

  const submit = async e => {
    e.preventDefault()
    const body = {title, text, fields: fieldVals}
    if (entry_id) {
      await fetch_(`entries/${entry_id}`, 'PUT', body, jwt)
    } else {
      await fetch_(`entries`, 'POST', body, jwt)
    }
    history.push('/j')
  }

  const createField = async e => {
    // e.preventDefault()
    const body = {name: fieldName, type: fieldType}
    await fetch_(`fields`, 'POST', body, jwt)
    fetchEntry()
  }

  const fetchService = async (service) => {
    await fetch_(`${service}/${entry_id}`, 'GET', null, jwt)
    fetchEntry()
  }

  const changeTitle = e => setTitle(e.target.value)
  const changeText = e => setText(e.target.value)
  const changeFieldVal = (k, direct=false) => e => {
    const v = direct ? e : e.target.value
    setFieldVals({...fieldVals, [k]: v})
  }
  const changeFieldName = e => setFieldName(e.target.value)
  const changeFieldType = e => setFieldType(e.target.value)

  const renderFields = (group, service) => (
    <Form.Group controlId={`formFieldsFields`}>
      <Row sm={3}>
        {group.map(f => (
          <Col className='field-column'>
            <Form.Row>
              <Form.Label column="sm" lg={6}>
                <ReactMarkdown source={f.name} linkTarget='_blank' />
              </Form.Label>
              <Col>
              {f.type === 'fivestar' ? (
                <ReactStars
                  value={fieldVals[f.id]}
                  size={25}
                  onChange={changeFieldVal(f.id, true)}
                />
              ) : (
                <Form.Control
                  disabled={!!f.service}
                  type='text'
                  size="sm"
                  value={fieldVals[f.id]}
                  onChange={changeFieldVal(f.id)}
                />
              )}
              </Col>
            </Form.Row>
          </Col>
        ))}
      </Row>
      {
        entry_id &&
        service !== 'Custom' &&
        <Button onClick={() => fetchService(service)}>Sync {service}</Button>
      }
    </Form.Group>
  )


  const renderFieldGroups = () => {
    const groups = _.transform(fields, (m, v, k) => {
      const svc = v.service || 'Custom';
      (m[svc] || (m[svc] = [])).push(v)
    }, {})
    return (
      <Accordion>
        {_.map(groups, (group, service)=> (
          <Card>
            <Card.Header>
              <Accordion.Toggle as={Button} variant="link" eventKey={service}>
                {service}
              </Accordion.Toggle>
            </Card.Header>
            <Accordion.Collapse eventKey={service}>
              <Card.Body>{renderFields(group, service)}</Card.Body>
            </Accordion.Collapse>
          </Card>
        ))}
        <Card>
          <Card.Header>
            <Accordion.Toggle as={Button} variant="link" eventKey='more'>
              More
            </Accordion.Toggle>
          </Card.Header>
          <Accordion.Collapse eventKey='more'>
            <Card.Body>


              <Form.Group controlId="formFieldName">
                <Form.Label>Field Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Name"
                  value={fieldName}
                  onChange={changeFieldName}
                />
              </Form.Group>

              <Form.Group controlId="formFieldType">
                <Form.Label>Field Type</Form.Label>
                <Form.Control
                  as="select"
                  value={fieldType}
                  onChange={changeFieldType}
                >
                  <option>number</option>
                  <option>fivestar</option>
                </Form.Control>
              </Form.Group>

              <Button variant="primary" onClick={createField}>
                Submit
              </Button>



              <hr />
              <Button onClick={() => fetchService('habitica')}>Habitica</Button>
            </Card.Body>
          </Accordion.Collapse>
        </Card>
      </Accordion>
    )
  }

  return (
    <Form onSubmit={submit}>
      <Form.Group controlId="formTitle">
        <Form.Label>Title</Form.Label>
        <Form.Control
          type="text"
          placeholder="Title"
          value={title}
          onChange={changeTitle}
        />
      </Form.Group>

      <Row>
        <Col>
          <Form.Group controlId="formText">
            <Form.Label>Entry</Form.Label>
            <Form.Control
              as="textarea"
              placeholder="Entry"
              required
              rows={10}
              value={text}
              onChange={changeText}
            />
          </Form.Group>
        </Col>
        <Col className='markdown-render'>
          <ReactMarkdown source={text} linkTarget='_blank' />
        </Col>
      </Row>

      <hr />
      {renderFieldGroups()}
      <hr />

      <Button variant="primary" type="submit">
        Submit
      </Button>&nbsp;
      <Button variant='secondary' size="sm" onClick={cancel}>
        Cancel
      </Button>
    </Form>
  )
}
