import React, {useEffect, useState} from "react";
import {spinner, trueKeys} from "./utils";
import {Button, Table} from "react-bootstrap";
import Tags from "./Tags";

export default function Books({fetch_, as}) {
  const [books, setBooks] = useState([])
  const [fetching, setFetching] = useState(false)
  const [notShared, setNotShared] = useState(false)
  const [tags, setTags] = useState({})

  const fetchBooks = async () => {
    setFetching(true)
    const body = {}
    const tags_ = trueKeys(tags)
    if (tags_.length) { body['tags'] = tags_ }
    const {data, code, message} = await fetch_('books', 'POST', body)
    setFetching(false)
    if (code === 401) {return setNotShared(message)}
    setBooks(data)
  }

  if (notShared) {return <h5>{notShared}</h5>}

  return <>
    <div className='bottom-margin'>
      <Tags
        fetch_={fetch_}
        as={as}
        selected={tags}
        setSelected={setTags}
        noEdit={true}
      />
    </div>
    {fetching ? (
      <>
        {spinner}
        <p className='text-muted'>Loading book recommendations (1-10seconds)</p>
      </>
    ) : (
      <Button
        className='bottom-margin'
        variant='primary'
        onClick={fetchBooks}
      >Show Books</Button>
    )}
    <Table>
      <thead>
        <th>Author</th>
        <th>Title</th>
        <th>Description</th>
        <th>Topic</th>
      </thead>
      <tbody>
        {books.map(b => <tr>
          <td>{b.author}</td>
          <td>{b.title}</td>
          <td>{b.text}</td>
          <td>{b.topic}</td>
        </tr>)}
      </tbody>
    </Table>
  </>
}
