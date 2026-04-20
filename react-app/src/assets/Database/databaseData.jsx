import { EDGE_MARKERS } from './constants'

export const initialNodes = [
    {
        id: 'Person',
        type: 'TableNode',
        position: { x: 521, y: -165 },
        data: {
            label: (
                <div>
                    <u><strong>Person</strong></u>
                    <div>Name</div>
                    <div>Address</div>
                    <div>Phone Number</div>
                    <div>Preferred Email</div>
                    <div>SIN (PK)</div>
                    <div>Emergency Contact</div>
                    <div>Banking Information</div>
                </div>
            ),
        },
    },
    {
        id: 'Student',
        type: 'TableNode',
        position: { x: -200, y: -20 },
        data: {
            label: (
                <div>
                    <u><strong>Student</strong></u>
                    <div>Student ID (PK)</div>
                    <div>SIN (FK)</div>
                    <div>Grad Status</div>
                    <div>Faculty ID</div>
                </div>
            ),
        },
    },
    {
        id: 'Program Affiliation',
        type: 'TableNode',
        position: { x: -620, y: 220 },
        data: {
            label: (
                <div>
                    <u><strong>Program Affiliation</strong></u>
                    <div>Student ID (FK)</div>
                    <div>Program ID (PK)</div>
                    <div>College ID (FK)</div>
                </div>
            ),
        },
    },
    {
        id: 'Degree Program',
        type: 'TableNode',
        position: { x: -633, y: 573 },
        data: {
            label: (
                <div>
                    <u><strong>Degree Program</strong></u>
                    <div>Degree Program ID (PK)</div>
                    <div>Program Name</div>
                    <div>Degree Type</div>
                    <div>Faculty ID</div>
                    <div>Credit Requirements</div>
                    <div>Degree Prerequisites</div>
                </div>
            ),
        },
    },
    {
        id: 'Degree Prerequisites',
        type: 'TableNode',
        position: { x: 60, y: 600 },
        data: {
            label: (
                <div>
                    <u><strong>Degree Prerequisites</strong></u>
                    <div>Program ID (FK)</div>
                    <div>Course ID (PK)</div>
                </div>
            ),
        },
    },
    {
        id: 'Active Course List',
        type: 'TableNode',
        position: { x: -200, y: 440 },
        data: {
            label: (
                <div>
                    <u><strong>Active Course List</strong></u>
                    <div>Student ID (FK)</div>
                    <div>Course ID (PK)</div>
                    <div>Grade</div>
                </div>
            ),
        },
    },
    {
        id: 'Course',
        type: 'TableNode',
        position: { x: 640, y: 420 },
        data: {
            label: (
                <div>
                    <u><strong>Course</strong></u>
                    <div>Course Id (PK)</div>
                    <div>Course Name</div>
                    <div>Course Description</div>
                    <div>Credit Value</div>
                    <div>Faculty ID</div>
                    <div>Department ID</div>
                    <div>Cost</div>
                    <div>Program ID</div>
                    <div>University</div>
                    <div>Credits</div>
                </div>
            ),
        },
    },
    {
        id: 'Additional Resources',
        type: 'TableNode',
        position: { x: 640, y: 820 },
        data: {
            label: (
                <div>
                    <u><strong>Additional Resources</strong></u>
                    <div>Course ID (FK)</div>
                    <div>Resource ID (PK)</div>
                    <div>Name</div>
                    <div>Price</div>
                    <div>Resource Type</div>
                    <div>Resource Description</div>
                    <div>License Owner</div>
                    <div>Retrieval Location</div>
                    <div>Book (ISBN, Author) (FK)</div>
                </div>
            ),
        },
    },
    {
        id: 'Book',
        type: 'TableNode',
        position: { x: 640, y: 1160 },
        data: {
            label: (
                <div>
                    <u><strong>Book</strong></u>
                    <div>ISBN (PK)</div>
                    <div>Author</div>
                    <div>Title</div>
                    <div>Publisher</div>
                    <div>Publication Year</div>
                </div>
            ),
        },
    },
    {
        id: 'Course Prerequisites',
        type: 'TableNode',
        position: { x: 920, y: 820 },
        data: {
            label: (
                <div>
                    <u><strong>Course Prerequisites</strong></u>
                    <div>Course ID (FK)</div>
                    <div>Prerequisite Course ID (PK)</div>
                </div>
            ),
        },
    },
    {
        id: 'Past Course History',
        type: 'TableNode',
        position: { x: 1360, y: 1180 },
        data: {
            label: (
                <div>
                    <u><strong>Past Course History</strong></u>
                    <div>Course ID (FK)</div>
                    <div>Student ID (FK)</div>
                    <div>Grade</div>
                    <div>Year</div>
                    <div>Term</div>
                </div>
            ),
        },
    },
    {
        id: 'Section',
        type: 'TableNode',
        position: { x: 1360, y: 760 },
        data: {
            label: (
                <div>
                    <u><strong>Section</strong></u>
                    <div>Section ID (PK)</div>
                    <div>Course ID (FK)</div>
                    <div>Instructor ID (FK)</div>
                    <div>Term</div>
                    <div>Year</div>
                    <div>Time Slot</div>
                    <div>Start Date</div>
                    <div>End Date</div>
                    <div>Room</div>
                    <div>Location</div>
                    <div>Enrollment Capacity</div>
                    <div>Enrolled Capacity</div>
                </div>
            ),
        },
    },
    {
        id: 'Section Types',
        type: 'TableNode',
        position: { x: 1680, y: 1060 },
        data: {
            label: (
                <div>
                    <u><strong>Section Types</strong></u>
                    <div>Section Type ID (PK)</div>
                    <div>Section Type Name</div>
                    <div>Section Type Description</div>
                </div>
            ),
        },
    },
    {
        id: 'Room',
        type: 'TableNode',
        position: { x: 1740, y: 820 },
        data: {
            label: (
                <div>
                    <u><strong>Room</strong></u>
                    <div>Room ID (PK)</div>
                    <div>Building Name</div>
                    <div>Room Number</div>
                    <div>Capacity</div>
                    <div>Resources Available</div>
                </div>
            ),
        },
    },
    {
        id: 'Dean',
        type: 'TableNode',
        position: { x: 1980, y: 220 },
        data: {
            label: (
                <div>
                    <u><strong>Dean</strong></u>
                    <div>Dean ID (PK)</div>
                    <div>Office Location</div>
                    <div>Office Number</div>
                    <div>Office Email</div>
                </div>
            ),
        },
    },
    {
        id: 'Professor',
        type: 'TableNode',
        position: { x: 1080, y: 0 },
        data: {
            label: (
                <div>
                    <u><strong>Professor</strong></u>
                    <div>Professor ID (PK)</div>
                    <div>Tenure</div>
                    <div>Department ID (FK)</div>
                </div>
            ),
        },
    },
    {
        id: 'Teaching Assistant',
        type: 'TableNode',
        position: { x: 520, y: 100 },
        data: {
            label: (
                <div>
                    <u><strong>Teaching Assistant</strong></u>
                    <div>TA ID (PK)</div>
                    <div>Student ID (FK)</div>
                    <div>Department ID (FK)</div>
                    <div>Supervisor</div>
                </div>
            ),
        },
    },
    {
        id: 'Department',
        type: 'TableNode',
        position: { x: 1540, y: 500 },
        data: {
            label: (
                <div>
                    <u><strong>Department</strong></u>
                    <div>Department ID (PK)</div>
                    <div>Department Name</div>
                    <div>Department Description</div>
                    <div>Dean ID (FK)</div>
                </div>
            ),
        },
    },
    {
        id: 'Faculty',
        type: 'TableNode',
        position: { x: 1540, y: 220 },
        data: {
            label: (
                <div>
                    <u><strong>Faculty</strong></u>
                    <div>Faculty ID (PK)</div>
                    <div>Faculty Name</div>
                    <div>Faculty Description</div>
                </div>
            ),
        },
    },
    {
        id: 'Staff',
        type: 'TableNode',
        position: { x: 1539, y: -127 },
        data: {
            label: (
                <div>
                    <u><strong>Staff</strong></u>
                    <div>Staff ID (PK)</div>
                    <div>Position</div>
                    <div>Faculty ID (FK)</div>
                    <div>Department ID (FK)</div>
                </div>
            ),
        },
    },
]

export const initialEdges = [
    {
        id: 'student-person',
        type: 'relationship',
        source: 'Student',
        target: 'Person',
        label: 'FK: SIN',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.TRIANGLE_HOLLOW,
            sourceCardinality: '1',
            targetCardinality: '1',
        },
    },
    {
        id: 'program affiliation-student',
        type: 'relationship',
        source: 'Program Affiliation',
        target: 'Student',
        label: 'FK: Student ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'student degree program',
        type: 'relationship',
        source: 'Student',
        target: 'Degree Program',
        label: 'FK: Degree Program ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'program affiliation degree program',
        type: 'relationship',
        source: 'Program Affiliation',
        target: 'Degree Program',
        label: 'FK: Program ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'program affiliation college',
        type: 'relationship',
        source: 'Program Affiliation',
        target: 'Faculty',
        label: 'FK: College ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'degree program degree program prerequisites',
        type: 'relationship',
        source: 'Degree Program',
        target: 'Degree Prerequisites',
        label: 'FK: Degree Program Prerequisites',
        data: {
            startMarker: EDGE_MARKERS.DIAMOND_FILLED,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'degree program prerequisites course',
        type: 'relationship',
        source: 'Degree Prerequisites',
        target: 'Course',
        label: 'FK: Course ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'active course list-student',
        type: 'relationship',
        source: 'Active Course List',
        target: 'Student',
        label: 'FK: Student ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'active course list-course',
        type: 'relationship',
        source: 'Active Course List',
        target: 'Course',
        label: 'FK: Course ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'course-course prerequisites',
        type: 'relationship',
        source: 'Course',
        target: 'Course Prerequisites',
        label: 'FK: Course ID',
        data: {
            startMarker: EDGE_MARKERS.DIAMOND_FILLED,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'section past course history',
        type: 'relationship',
        source: 'Section',
        target: 'Past Course History',
        label: 'FK: Section ID',
        data: {
            startMarker: EDGE_MARKERS.DIAMOND_FILLED,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'course additional resources',
        type: 'relationship',
        source: 'Course',
        target: 'Additional Resources',
        label: 'FK: Course ID',
        data: {
            startMarker: EDGE_MARKERS.DIAMOND_HOLLOW,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'additional resources book',
        type: 'relationship',
        source: 'Additional Resources',
        target: 'Book',
        label: 'FK: Book (ISBN, Author)',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '0..n',
        },
    },
    {
        id: 'section course',
        type: 'relationship',
        source: 'Section',
        target: 'Course',
        label: 'FK: Course ID',
        data: {
            startMarker: EDGE_MARKERS.ARROW_FILLED,
            endMarker: EDGE_MARKERS.DIAMOND_FILLED,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'section professor',
        type: 'relationship',
        source: 'Section',
        target: 'Professor',
        label: 'FK: Instructor ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'section room',
        type: 'relationship',
        source: 'Section',
        target: 'Room',
        label: 'FK: Room ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'section types section',
        type: 'relationship',
        source: 'Section Types',
        target: 'Section',
        label: 'FK: Section ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'professor person',
        type: 'relationship',
        source: 'Professor',
        target: 'Person',
        label: 'FK: SIN',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.TRIANGLE_HOLLOW,
            sourceCardinality: '1',
            targetCardinality: '1',
        },
    },
    {
        id: 'professor staff',
        type: 'relationship',
        source: 'Professor',
        target: 'Staff',
        label: 'FK: Staff ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.TRIANGLE_HOLLOW,
            sourceCardinality: '0..1',
            targetCardinality: '1',
        },
    },
    {
        id: 'professor department',
        type: 'relationship',
        source: 'Professor',
        target: 'Department',
        label: 'FK: Department ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '1',
        },
    },
    {
        id: 'teaching assistant student',
        type: 'relationship',
        source: 'Teaching Assistant',
        target: 'Student',
        label: 'FK: Student ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.TRIANGLE_HOLLOW,
            sourceCardinality: '1',
            targetCardinality: '1',
        },
    },
    {
        id: 'teaching assistant professor',
        type: 'relationship',
        source: 'Teaching Assistant',
        target: 'Professor',
        label: 'FK: Supervisor',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '0..1',
        },
    },
    {
        id: 'department faculty',
        type: 'relationship',
        source: 'Department',
        target: 'Faculty',
        label: 'FK: Faculty ID',
        data: {
            startMarker: EDGE_MARKERS.DIAMOND_HOLLOW,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '0..1',
        },
    },
    {
        id: 'staff faculty',
        type: 'relationship',
        source: 'Staff',
        target: 'Faculty',
        label: 'FK: Faculty ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '0..n',
            targetCardinality: '0..1',
        },
    },
    {
        id: 'dean faculty',
        type: 'relationship',
        source: 'Dean',
        target: 'Faculty',
        label: 'FK: Faculty ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.NONE,
            sourceCardinality: '1',
            targetCardinality: '1',
        },
    },
    {
        id: 'staff person',
        type: 'relationship',
        source: 'Staff',
        target: 'Person',
        label: 'FK: SIN',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.TRIANGLE_HOLLOW,
            sourceCardinality: '1',
            targetCardinality: '1',
        },
    },
    {
        id: 'dean staff',
        type: 'relationship',
        source: 'Dean',
        target: 'Staff',
        label: 'FK: Staff ID',
        data: {
            startMarker: EDGE_MARKERS.NONE,
            endMarker: EDGE_MARKERS.TRIANGLE_HOLLOW,
            sourceCardinality: '1',
            targetCardinality: '1',
        },
    },
]
