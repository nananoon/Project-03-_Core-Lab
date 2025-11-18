import './App.css'
import { FormControl, InputGroup, Container, Button, Card, Row, Col } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

const clientId = import.meta.env.VITE_CLIENT_ID;
const clientSecret = import.meta.env.VITE_CLIENT_SECRET;

// Draggable Album Card Component
function DraggableAlbum({ album, index, moveAlbum, removeFromCurated, isCurated }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'album',
    item: { album, index, isCurated },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <Card style={{
        backgroundColor: 'white',
        margin: '10px',
        borderRadius: '5px',
        marginBottom: '30px',
        border: isDragging ? '2px dashed #10b981' : 'none',
      }}>
        <Card.Img 
          width={200} 
          src={album.images[0]?.url} 
          style={{
            borderRadius: '4%',
          }} 
        />
        
        <Card.Body>
          <Card.Title style={{
            whiteSpace: 'wrap',
            fontWeight: 'bold',
            maxWidth: '200px',
            fontSize: '18px',
            marginTop: '10px',
            color: 'black'
          }}>
            {album.name}
          </Card.Title>
          
          <Card.Text style={{ color: 'black' }}>
            Release Date: <br/> {album.release_date}
          </Card.Text>
          
          <Button 
            href={album.external_urls.spotify} 
            target="_blank"
            style={{
              backgroundColor: 'black',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '15px',
              borderRadius: '5px',
              padding: '10px',
              marginRight: '5px',
            }}
          >
            Album Link
          </Button>
          
          {isCurated && (
            <Button 
              onClick={() => removeFromCurated(index)}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '15px',
                borderRadius: '5px',
                padding: '10px',
                marginTop: '5px',
              }}
            >
              Remove
            </Button>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

// Drop Zone for Curated Albums
function DropZone({ children, onDrop }) {
  const [{ isOver }, drop] = useDrop({
    accept: 'album',
    drop: (item) => {
      if (!item.isCurated) {
        onDrop(item.album)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  return (
    <div
      ref={drop}
      style={{
        minHeight: '400px',
        backgroundColor: isOver ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        border: isOver ? '3px dashed #10b981' : '2px dashed rgba(255, 255, 255, 0.3)',
        borderRadius: '10px',
        padding: '20px',
        transition: 'all 0.3s ease',
      }}
    >
      {children}
    </div>
  )
}

//MAIN APP COMPONENTS ---> State Variables 
function App() {
  const [searchInput, setSearchInput] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [albums, setAlbums] = useState([])
  const [curatedAlbums, setCuratedAlbums] = useState([])

  useEffect(() => {
    var authParams = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&client_id=' + clientId + '&client_secret=' + clientSecret,
    }
    
    fetch('https://accounts.spotify.com/api/token', authParams)
      .then(result => result.json())
      .then(data => {
        setAccessToken(data.access_token)
      })
  }, [])

  async function search() {
    if (!searchInput.trim()) {
      alert('Please enter an artist name')
      return
    }

    var artistParams = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken,
      },
    }
    
    try {
      // Get Artist
      var artistID = await fetch('https://api.spotify.com/v1/search?q=' + encodeURIComponent(searchInput) + '&type=artist', artistParams)
        .then(result => result.json())
        .then(data => {
          if (!data.artists?.items?.length) {
            throw new Error('No artist found')
          }
          return data.artists.items[0].id
        })
      
      // Get Artist Albums
      await fetch('https://api.spotify.com/v1/artists/' + artistID + '/albums?include_groups=album&market=US&limit=50', artistParams)
        .then(result => result.json())
        .then(data => {
          setAlbums(data.items)
        })
    } catch (error) {
      alert('Artist not found. Try another search.')
      console.error(error)
    }
  }

  const addToCurated = (album) => {
    // Check if album already exists in curated list
    if (!curatedAlbums.find(a => a.id === album.id)) {
      setCuratedAlbums([...curatedAlbums, album])
    }
  }

  const removeFromCurated = (index) => {
    const newCurated = curatedAlbums.filter((_, i) => i !== index)
    setCuratedAlbums(newCurated)
  }

  const moveCuratedAlbum = (dragIndex, hoverIndex) => {
    const draggedAlbum = curatedAlbums[dragIndex]
    const newCurated = [...curatedAlbums]
    newCurated.splice(dragIndex, 1)
    newCurated.splice(hoverIndex, 0, draggedAlbum)
    setCuratedAlbums(newCurated)
  }

  const clearCurated = () => {
    if (window.confirm('Clear all curated albums?')) {
      setCuratedAlbums([])
    }
  }

  const saveCurated = () => {
    const playlistData = {
      albums: curatedAlbums.map(album => ({
        name: album.name,
        artist: album.artists?.[0]?.name,
        release_date: album.release_date,
        spotify_url: album.external_urls.spotify,
        image: album.images[0]?.url,
      }))
    }
    
    // Download as JSON
    const dataStr = JSON.stringify(playlistData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'my-curated-albums.json'
    link.click()
    
    alert('Playlist saved!')
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Container style={{ marginBottom: '30px', marginTop: '30px' }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '30px',
          color: 'white',
          fontSize: '3rem',
        }}>
          ALBUM CURATOR
        </h1>

        <InputGroup>
          <FormControl
            placeholder="Search For Artist"
            type='input'
            aria-label="Search for an Artist"
            onKeyDown={event => {
              if (event.key === "Enter") {
                search()
              }
            }}
            onChange={event => setSearchInput(event.target.value)}
            style={{
              width: '300px',
              height: '35px',
              borderWidth: '0px',
              borderStyle: 'solid',
              borderRadius: '5px',
              marginRight: '10px',
              paddingLeft: '10px'
            }}
          />
          
          <Button onClick={search}>
            Search
          </Button>
        </InputGroup>
      </Container>

      <Container fluid>
        <Row>
          {/* Search Results Column */}
          <Col md={7}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h2 style={{ 
                color: 'white', 
                marginBottom: '20px',
                textAlign: 'center',
              }}>
                Search Results
                {albums.length > 0 && (
                  <span style={{ fontSize: '1rem', opacity: 0.7 }}>
                    {' '}({albums.length} albums)
                  </span>
                )}
              </h2>
              
              {albums.length === 0 ? (
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}>
                  Search for an artist to see their albums.<br/>
                  Drag albums to your curated collection →
                </p>
              ) : (
                <Row style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-around',
                  alignContent: 'center',
                }}>
                  {albums.map((album, index) => (
                    <DraggableAlbum
                      key={album.id}
                      album={album}
                      index={index}
                      isCurated={false}
                    />
                  ))}
                </Row>
              )}
            </div>
          </Col>

          {/* Curated Albums Column */}
          <Col md={5}>
            <div style={{
              position: 'sticky',
              top: '20px',
            }}>
              <h2 style={{ 
                color: 'white', 
                marginBottom: '20px',
                textAlign: 'center',
              }}>
                My Curated Collection
                {curatedAlbums.length > 0 && (
                  <span style={{ fontSize: '1rem', opacity: 0.7 }}>
                    {' '}({curatedAlbums.length} albums)
                  </span>
                )}
              </h2>

              {curatedAlbums.length > 0 && (
                <div style={{ 
                  marginBottom: '15px',
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center',
                }}>
                  <Button
                    onClick={saveCurated}
                    style={{
                      backgroundColor: '#10b981',
                      border: 'none',
                      fontWeight: 'bold',
                    }}
                  >
                    💾 Save Playlist
                  </Button>
                  <Button
                    onClick={clearCurated}
                    variant="danger"
                    style={{
                      fontWeight: 'bold',
                    }}
                  >
                    🗑️ Clear All
                  </Button>
                </div>
              )}

              <DropZone onDrop={addToCurated}>
                {curatedAlbums.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.6)',
                    padding: '50px 20px',
                  }}>
                    <h3 style={{ fontSize: '3rem', marginBottom: '20px' }}>📂</h3>
                    <p style={{ fontSize: '1.2rem' }}>
                      Drag & Drop albums here
                    </p>
                    <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                      Create your perfect album collection
                    </p>
                  </div>
                ) : (
                  <Row style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    {curatedAlbums.map((album, index) => (
                      <DraggableAlbum
                        key={album.id + '-curated'}
                        album={album}
                        index={index}
                        moveAlbum={moveCuratedAlbum}
                        removeFromCurated={removeFromCurated}
                        isCurated={true}
                      />
                    ))}
                  </Row>
                )}
              </DropZone>
            </div>
          </Col>
        </Row>
      </Container>
    </DndProvider>
  )
}

export default App