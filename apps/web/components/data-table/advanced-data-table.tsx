"use client"

import React, { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Settings,
  Columns,
  SortAsc,
  SortDesc,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: any) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  type?: 'text' | 'number' | 'date' | 'badge' | 'actions'
}

interface AdvancedDataTableProps {
  data: any[]
  columns: Column[]
  title?: string
  description?: string
  loading?: boolean
  searchable?: boolean
  filterable?: boolean
  selectable?: boolean
  exportable?: boolean
  pagination?: boolean
  pageSize?: number
  onRowClick?: (row: any) => void
  onRowSelect?: (selectedRows: any[]) => void
  onRefresh?: () => void
  actions?: {
    label: string
    icon?: React.ComponentType<{ className?: string }>
    onClick: (row: any) => void
    variant?: 'default' | 'destructive' | 'outline'
  }[]
  bulkActions?: {
    label: string
    icon?: React.ComponentType<{ className?: string }>
    onClick: (selectedRows: any[]) => void
    variant?: 'default' | 'destructive' | 'outline'
  }[]
}

export function AdvancedDataTable({
  data,
  columns,
  title,
  description,
  loading = false,
  searchable = true,
  filterable = true,
  selectable = false,
  exportable = false,
  pagination = true,
  pageSize = 10,
  onRowClick,
  onRowSelect,
  onRefresh,
  actions = [],
  bulkActions = []
}: AdvancedDataTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<any[]>([])
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(col => col.key))

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(row =>
        columns.some(col => {
          const value = row[col.key]
          return value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        })
      )
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue !== '__all__') {
        filtered = filtered.filter(row => {
          const value = row[column]
          return value?.toString().toLowerCase().includes(filterValue.toLowerCase())
        })
      }
    })

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, searchQuery, sortColumn, sortDirection, columnFilters, columns])

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize)
  const paginatedData = pagination 
    ? processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : processedData

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedData)
    } else {
      setSelectedRows([])
    }
    onRowSelect?.(checked ? paginatedData : [])
  }

  const handleSelectRow = (row: any, checked: boolean) => {
    const newSelectedRows = checked
      ? [...selectedRows, row]
      : selectedRows.filter(r => r !== row)
    
    setSelectedRows(newSelectedRows)
    onRowSelect?.(newSelectedRows)
  }

  const exportData = () => {
    const csv = [
      columns.map(col => col.label).join(','),
      ...processedData.map(row => 
        columns.map(col => row[col.key] || '').join(',')
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'data'}.csv`
    a.click()
  }

  const visibleColumnsData = columns.filter(col => visibleColumns.includes(col.key))

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            )}
            
            {exportable && (
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns className="w-4 h-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {columns.map(column => (
                  <DropdownMenuItem
                    key={column.key}
                    onClick={() => {
                      const newVisible = visibleColumns.includes(column.key)
                        ? visibleColumns.filter(key => key !== column.key)
                        : [...visibleColumns, column.key]
                      setVisibleColumns(newVisible)
                    }}
                  >
                    <Checkbox 
                      checked={visibleColumns.includes(column.key)}
                      className="mr-2"
                    />
                    {column.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          
          {filterable && (
            <div className="flex gap-2">
              {columns.filter(col => col.filterable).map(column => (
                <Select
                  key={column.key}
                  value={columnFilters[column.key] || '__all__'}
                  onValueChange={(value) => setColumnFilters(prev => ({ 
                    ...prev, 
                    [column.key]: value === '__all__' ? '' : value 
                  }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={column.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All {column.label}</SelectItem>
                    {/* Add unique values for this column */}
                    {Array.from(new Set(data.map(row => row[column.key])))
                      .filter(value => value !== null && value !== undefined && value !== '')
                      .map(value => (
                        <SelectItem key={String(value)} value={String(value)}>{String(value)}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectable && selectedRows.length > 0 && bulkActions.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedRows.length} item(s) selected
            </span>
            <div className="flex gap-2 ml-auto">
              {bulkActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => action.onClick(selectedRows)}
                >
                  {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                
                {visibleColumnsData.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      column.width && `w-${column.width}`,
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.sortable && 'cursor-pointer hover:bg-muted/50'
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && (
                        <div className="flex flex-col">
                          {sortColumn === column.key ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
                
                {actions.length > 0 && (
                  <TableHead className="w-20 text-center">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={index}>
                    {selectable && <TableCell><div className="w-4 h-4 bg-muted animate-pulse rounded" /></TableCell>}
                    {visibleColumnsData.map((column) => (
                      <TableCell key={column.key}>
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </TableCell>
                    ))}
                    {actions.length > 0 && <TableCell><div className="w-8 h-4 bg-muted animate-pulse rounded mx-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={visibleColumnsData.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow
                    key={index}
                    className={cn(
                      onRowClick && 'cursor-pointer hover:bg-muted/50',
                      selectedRows.includes(row) && 'bg-muted/30'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRows.includes(row)}
                          onCheckedChange={(checked) => handleSelectRow(row, checked as boolean)}
                        />
                      </TableCell>
                    )}
                    
                    {visibleColumnsData.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </TableCell>
                    ))}
                    
                    {actions.length > 0 && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.map((action, actionIndex) => (
                              <DropdownMenuItem
                                key={actionIndex}
                                onClick={() => action.onClick(row)}
                                className={cn(
                                  action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                                )}
                              >
                                {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} results
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm font-medium px-3">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}