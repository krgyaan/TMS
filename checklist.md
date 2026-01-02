## Checklist: Comparing Laravel Code with NestJS/React Implementation

### Phase 1: Understanding the Laravel code
- [ ] Read and understand the Laravel method/function
- [ ] Identify the purpose (data fetching, filtering, search, etc.)
- [ ] Note all query parameters and filters
- [ ] Identify all database tables/relationships used
- [ ] Note any joins, eager loading, or relationships
- [ ] Identify search fields and search logic
- [ ] Note filtering conditions (status, dates, roles, etc.)
- [ ] Identify sorting/ordering logic
- [ ] Note any role-based access control
- [ ] Identify return data structure and fields
- [ ] Note any computed/formatted fields

### Phase 2: Finding corresponding NestJS/React code
- [ ] Search for the equivalent service file in NestJS
- [ ] Find the corresponding controller endpoint
- [ ] Locate the frontend hook/API service
- [ ] Find the React component/page that uses it
- [ ] Identify the data flow: Component → Hook → API Service → Controller → Service

### Phase 3: Comparison analysis
- [ ] Compare filtering logic (status, dates, conditions)
- [ ] Compare search implementation (fields searched, search type)
- [ ] Compare role-based access control
- [ ] Compare data structure (fields returned, nested data)
- [ ] Compare sorting/ordering logic
- [ ] Compare pagination implementation
- [ ] Compare join strategies (inner vs left joins)
- [ ] Compare computed/formatted fields
- [ ] Compare default values and fallbacks

### Phase 4: Gap identification
- [ ] List missing features in NestJS
- [ ] List differences in filtering logic
- [ ] List missing search fields
- [ ] List missing data fields in response
- [ ] List incorrect business logic
- [ ] Prioritize critical vs nice-to-have gaps

### Phase 5: Report creation
- [ ] Create a comparison report with:
  - [ ] Summary of differences
  - [ ] Critical issues (data mismatch, missing filters)
  - [ ] Missing features (search, role-based access)
  - [ ] Data structure differences
  - [ ] Recommendations for fixes

### Phase 6: User confirmation
- [ ] Present the report
- [ ] Wait for user to specify what to fix
- [ ] Clarify ambiguous requirements
- [ ] Confirm priority of fixes

### Phase 7: Implementation planning
- [ ] Create a plan with:
  - [ ] Files to modify
  - [ ] Changes needed per file
  - [ ] Dependencies/imports required
  - [ ] Testing considerations
- [ ] Get user confirmation before implementing

### Phase 8: Implementation
- [ ] Update backend service (filtering, search, data structure)
- [ ] Update backend controller (add parameters if needed)
- [ ] Update frontend API service (add parameters)
- [ ] Update frontend hook (pass parameters)
- [ ] Update frontend component (UI changes if needed)
- [ ] Update TypeScript types if needed
- [ ] Add TODO comments for future work (if requested)

### Phase 9: Verification
- [ ] Check for linting errors
- [ ] Verify all imports are correct
- [ ] Verify type definitions match
- [ ] Verify search functionality works
- [ ] Verify filtering matches Laravel behavior
- [ ] Verify data structure matches Laravel response
- [ ] Test edge cases (empty results, null values)

### Phase 10: Documentation
- [ ] Document any intentional differences from Laravel
- [ ] Add comments explaining complex logic
- [ ] Note any performance considerations
- [ ] Document any breaking changes

### Key questions to ask myself
1. Does the filtering logic match Laravel exactly?
2. Are all search fields implemented?
3. Is role-based access control implemented?
4. Does the data structure match Laravel's response?
5. Are all joins correct (inner vs left)?
6. Are computed fields/formatters matching?
7. Are there any missing fields in the response?
8. Is the ordering logic correct?

### Red flags to watch for
- Different filtering conditions (status checks, date ranges)
- Missing search functionality
- Missing role-based filtering
- Different join types (inner vs left)
- Missing fields in response
- Different data structure/naming
- Missing computed/formatted fields
- Different default ordering
