import React, { useState } from 'react';
import { auditLogs as auditLogsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuditLogPage() {
  const [filterEmail, setFilterEmail] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditLogsApi.list({}, { sort: '-created_date', limit: 100 }),
  });

  const filtered = logs.filter(log => {
    if (filterEmail && !log.user_email.toLowerCase().includes(filterEmail.toLowerCase())) return false;
    if (filterAction && log.action !== filterAction) return false;
    if (filterStatus && log.status !== filterStatus) return false;
    return true;
  });

  const getActionBadge = (action) => {
    const variants = {
      view: 'bg-blue-50 text-blue-700',
      export_attempted: 'bg-red-50 text-red-700',
      download_attempted: 'bg-red-50 text-red-700',
      share: 'bg-green-50 text-green-700',
      data_access: 'bg-slate-50 text-slate-700',
    };
    return variants[action] || 'bg-slate-50 text-slate-700';
  };

  const getStatusIcon = (status) => {
    if (status === 'denied') return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (status === 'attempted') return <AlertCircle className="h-4 w-4 text-amber-600" />;
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-slate-800" /> Audit Log
          </h1>
          <p className="text-slate-500 mt-1">All sensitive data access and attempts are logged</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Filter by Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Search className="h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="user@example.com"
                    value={filterEmail}
                    onChange={(e) => setFilterEmail(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Filter by Action</Label>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All actions</SelectItem>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="export_attempted">Export Attempted</SelectItem>
                    <SelectItem value="download_attempted">Download Attempted</SelectItem>
                    <SelectItem value="share">Share</SelectItem>
                    <SelectItem value="data_access">Data Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Filter by Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="attempted">Attempted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Log ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan="7" className="text-center py-8 text-slate-500">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="7" className="text-center py-8 text-slate-500">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-slate-600">
                          {new Date(log.created_date).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{log.user_email}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${getActionBadge(log.action)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.entity_type}</TableCell>
                        <TableCell className="text-sm text-slate-600">{log.resource_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="text-xs capitalize">{log.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                          {log.reason_denied || (log.details?.timestamp ? new Date(log.details.timestamp).toLocaleTimeString() : '—')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}