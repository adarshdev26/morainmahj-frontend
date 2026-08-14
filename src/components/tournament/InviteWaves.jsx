import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function InviteWaves({ selected, onWavesChange }) {
  const [waves, setWaves] = useState([
    { id: 'wave-1', name: 'Wave 1: VIPs', players: [] },
    { id: 'wave-2', name: 'Wave 2: Active Players', players: [] },
    { id: 'wave-3', name: 'Wave 3: Everyone Else', players: [] },
  ]);

  const [unassignedPlayers, setUnassignedPlayers] = useState(selected);

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const playerId = draggableId;
    const player = [...unassignedPlayers, ...waves.flatMap(w => w.players)].find(p => p.id === playerId);
    if (!player) return;

    const newWaves = waves.map(w => ({
      ...w,
      players: w.players.filter(p => p.id !== playerId),
    }));
    let newUnassigned = unassignedPlayers.filter(p => p.id !== playerId);

    if (destination.droppableId === 'unassigned') {
      setUnassignedPlayers([...newUnassigned, player]);
    } else {
      const waveIndex = newWaves.findIndex(w => w.id === destination.droppableId);
      if (waveIndex !== -1) {
        newWaves[waveIndex].players.push(player);
      }
      setUnassignedPlayers(newUnassigned);
    }

    setWaves(newWaves);
    onWavesChange(newWaves.filter(w => w.players.length > 0));
  };

  const addWave = () => {
    const newId = `wave-${Date.now()}`;
    setWaves([...waves, { id: newId, name: `Wave ${waves.length + 1}`, players: [] }]);
  };

  const deleteWave = (id) => {
    const wave = waves.find(w => w.id === id);
    if (wave) {
      setUnassignedPlayers([...unassignedPlayers, ...wave.players]);
      setWaves(waves.filter(w => w.id !== id));
    }
  };

  return (
    <Card className="mb-6 border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Invitation Waves</CardTitle>
          <Button variant="outline" size="sm" onClick={addWave} className="gap-1 text-xs h-7">
            <Plus className="h-3 w-3" />
            Add Wave
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-3">
            {/* Unassigned */}
            <Droppable droppableId="unassigned">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-3 rounded-lg border-2 border-dashed transition-colors ${
                    snapshot.isDraggingOver ? 'bg-slate-50 border-slate-400' : 'bg-white border-slate-200'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-600 mb-2">
                    Unassigned ({unassignedPlayers.length})
                  </p>
                  <div className="flex flex-wrap gap-1 min-h-7">
                    {unassignedPlayers.map((p, idx) => (
                      <Draggable key={p.id} draggableId={p.id} index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`transition-opacity ${snapshot.isDragging ? 'opacity-50' : ''}`}
                          >
                            <Badge variant="outline" className="text-xs cursor-move bg-slate-50">
                              {p.name.split(' ')[0]}
                            </Badge>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Waves */}
            {waves.map((wave) => (
              <Droppable key={wave.id} droppableId={wave.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-3 rounded-lg border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary/5 border-primary' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-slate-700">
                        {wave.name} ({wave.players.length})
                      </p>
                      {wave.players.length === 0 && (
                        <button
                          onClick={() => deleteWave(wave.id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 min-h-7">
                      {wave.players.map((p, idx) => (
                        <Draggable key={p.id} draggableId={p.id} index={idx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-opacity ${snapshot.isDragging ? 'opacity-50' : ''}`}
                            >
                              <Badge className="text-xs cursor-move">
                                {p.name.split(' ')[0]}
                              </Badge>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}