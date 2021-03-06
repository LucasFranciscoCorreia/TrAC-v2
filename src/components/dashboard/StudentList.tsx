import { chunk, some, sortBy, toInteger, truncate, uniq } from "lodash";
import React, {
  FC,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaListOl } from "react-icons/fa";
import ReactTooltip from "react-tooltip";
import { useUpdateEffect } from "react-use";
import { Pagination, Progress, Table, TableCell } from "semantic-ui-react";
import { useRememberState } from "use-remember-state";

import { useQuery } from "@apollo/react-hooks";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Icon,
  Spinner,
  Text,
  useDisclosure,
} from "@chakra-ui/core";

import { STUDENT_LIST } from "../../graphql/queries";
import { useUser } from "../../utils/useUser";
import { ConfigContext } from "../Config";
import { TrackingContext } from "../Tracking";

type columnNames =
  | "student_id"
  | "dropout_probability"
  | "start_year"
  | "progress";

const nStudentPerChunk = 50;

export const StudentList: FC<{
  mockData?: Record<columnNames, string | number>[];
  program_id?: string;
  searchStudent: (student: string) => Promise<void>;
}> = ({ mockData, program_id, searchStudent }) => {
  const Tracking = useContext(TrackingContext);

  const { data: dataStudentList, loading: loadingData } = useQuery(
    STUDENT_LIST,
    {
      variables: {
        program_id,
      },
      skip: !program_id,
    }
  );

  const studentListData = useMemo<
    Record<columnNames, string | number>[]
  >(() => {
    return (
      mockData ||
      (dataStudentList?.students.map(
        ({ id, start_year, progress, dropout }) => {
          return {
            student_id: id,
            dropout_probability: dropout?.prob_dropout ?? -1,
            progress: progress * 100,
            start_year,
          };
        }
      ) ??
        [])
    );
  }, [dataStudentList, mockData]);

  const { user } = useUser();

  const { isOpen, onOpen, onClose } = useDisclosure(
    localStorage.getItem("student_list_open") ? true : false
  );

  useUpdateEffect(() => {
    Tracking.current.track({
      action: "click",
      effect: isOpen ? "open-student-list" : "close-student-list",
      target: isOpen ? "student-list-button" : "outside-student-list",
    });
  }, [isOpen]);

  useUpdateEffect(() => {
    if (isOpen) {
      localStorage.setItem("student_list_open", "1");
    } else {
      localStorage.removeItem("student_list_open");
    }
  }, [isOpen]);

  const btnRef = useRef<HTMLElement>(null);

  const [columnSort, setColumnSort] = useRememberState<columnNames[]>(
    "student_list_columns_sort",
    ["student_id", "start_year", "dropout_probability", "dropout_probability"]
  );

  const [directionSort, setDirectionSort] = useRememberState<
    "ascending" | "descending" | undefined
  >("student_list_direction_sort", undefined);

  const [sortedStudentList, setSortedStudentList] = useState(() =>
    sortBy(studentListData, columnSort)
  );

  useEffect(() => {
    const newSortedStudentList = sortBy(studentListData, columnSort);
    if (directionSort === "descending") {
      newSortedStudentList.reverse();
    }
    setSortedStudentList(newSortedStudentList);
  }, [studentListData, directionSort, columnSort, setSortedStudentList]);

  const [pageSelected, setPageSelected] = useRememberState(
    "student_list_page_selected",
    1
  );

  useUpdateEffect(() => {
    Tracking.current.track({
      action: "click",
      target: "student-list-header-sort",
      effect: `sort-student-list-by-${columnSort.join("|")}-${directionSort}`,
    });
  }, [directionSort, columnSort]);

  const [studentListChunks, setStudentListChunks] = useState(() =>
    chunk(sortedStudentList, nStudentPerChunk)
  );

  useEffect(() => {
    if (pageSelected > studentListChunks.length) {
      setPageSelected(1);
    }
  }, [studentListChunks, pageSelected, setPageSelected]);

  useEffect(() => {
    setStudentListChunks(chunk(sortedStudentList, nStudentPerChunk));
  }, [sortedStudentList, setStudentListChunks]);

  const showDropout = useMemo(() => {
    return (
      !!user?.config?.SHOW_DROPOUT &&
      some(studentListData, ({ dropout_probability }) => {
        return (dropout_probability ?? -1) !== -1;
      })
    );
  }, [user, studentListData]);

  const {
    STUDENT_LIST_TITLE,
    STUDENT_LABEL,
    ENTRY_YEAR_LABEL,
    PROGRESS_LABEL,
    RISK_LABEL,
    RISK_HIGH_COLOR,
    RISK_HIGH_THRESHOLD,
    RISK_MEDIUM_COLOR,
    RISK_MEDIUM_THRESHOLD,
    RISK_LOW_COLOR,
    CHECK_STUDENT_FROM_LIST_LABEL,
  } = useContext(ConfigContext);

  const handleSort = (clickedColumn: columnNames) => () => {
    if (columnSort[0] !== clickedColumn) {
      setColumnSort(columnSortList => uniq([clickedColumn, ...columnSortList]));
      setDirectionSort("ascending");
    } else {
      setDirectionSort(
        directionSort === "ascending" ? "descending" : "ascending"
      );
    }
  };

  return (
    <>
      <Button
        isLoading={loadingData}
        m={2}
        ref={btnRef}
        variantColor="blue"
        onClick={onOpen}
        cursor="pointer"
        leftIcon={FaListOl}
        fontFamily="Lato"
      >
        {STUDENT_LIST_TITLE}
      </Button>

      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={btnRef}
        size="lg"
        scrollBehavior="inside"
        isFullHeight
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader height={20} display="flex" alignItems="center">
            {STUDENT_LIST_TITLE} {loadingData && <Spinner ml={3} />}
          </DrawerHeader>

          <DrawerBody>
            <Pagination
              totalPages={studentListChunks.length}
              activePage={pageSelected}
              onPageChange={(_, { activePage }) => {
                Tracking.current.track({
                  action: "click",
                  target: `student-list-pagination`,
                  effect: `set-student-list-page-to-${activePage}`,
                });
                setPageSelected(toInteger(activePage));
              }}
            />
            <Table sortable celled fixed>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell width={2} />
                  <Table.HeaderCell
                    width={5}
                    sorted={
                      columnSort[0] === "student_id" ? directionSort : undefined
                    }
                    onClick={handleSort("student_id")}
                  >
                    {STUDENT_LABEL}
                  </Table.HeaderCell>
                  <Table.HeaderCell
                    width={3}
                    sorted={
                      columnSort[0] === "start_year" ? directionSort : undefined
                    }
                    onClick={handleSort("start_year")}
                  >
                    {ENTRY_YEAR_LABEL}
                  </Table.HeaderCell>
                  <Table.HeaderCell
                    width={5}
                    sorted={
                      columnSort[0] === "progress" ? directionSort : undefined
                    }
                    onClick={handleSort("progress")}
                  >
                    {PROGRESS_LABEL}
                  </Table.HeaderCell>
                  {showDropout && (
                    <Table.HeaderCell
                      sorted={
                        columnSort[0] === "dropout_probability"
                          ? directionSort
                          : undefined
                      }
                      onClick={handleSort("dropout_probability")}
                      width={3}
                    >
                      {RISK_LABEL}
                    </Table.HeaderCell>
                  )}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {studentListChunks[pageSelected - 1]?.map(
                  (
                    { student_id, dropout_probability, start_year, progress },
                    key
                  ) => {
                    let color: string;
                    if (dropout_probability > RISK_HIGH_THRESHOLD) {
                      color = RISK_HIGH_COLOR;
                    } else if (dropout_probability > RISK_MEDIUM_THRESHOLD) {
                      color = RISK_MEDIUM_COLOR;
                    } else {
                      color = RISK_LOW_COLOR;
                    }
                    return (
                      <Table.Row key={student_id} verticalAlign="middle">
                        <TableCell textAlign="center">
                          {1 + key + (pageSelected - 1) * nStudentPerChunk}
                          <ReactTooltip id={`student_list_${key}`} />
                          <ReactTooltip id={`student_list_check_${key}`} />
                        </TableCell>
                        <Table.Cell
                          className="cursorPointer"
                          onClick={() => {
                            searchStudent(student_id.toString());
                            onClose();
                          }}
                        >
                          <Text
                            data-tip={`${CHECK_STUDENT_FROM_LIST_LABEL} ${student_id}`}
                            data-for={`student_list_check_${key}`}
                          >
                            {truncate(student_id.toString(), { length: 16 })}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text>{start_year}</Text>
                        </Table.Cell>
                        <Table.Cell verticalAlign="middle">
                          <Progress
                            style={{ margin: 0 }}
                            percent={toInteger(progress)}
                            data-tip={`${toInteger(progress)}%`}
                            data-for={`student_list_${key}`}
                          />
                        </Table.Cell>
                        {showDropout && (
                          <Table.Cell>
                            <Text
                              color={
                                dropout_probability !== -1 ? color : undefined
                              }
                            >
                              {dropout_probability !== -1
                                ? `${toInteger(dropout_probability)}%`
                                : "-"}
                            </Text>
                          </Table.Cell>
                        )}
                      </Table.Row>
                    );
                  }
                )}
              </Table.Body>
            </Table>
          </DrawerBody>
          <DrawerFooter justifyContent="flex-start">
            <Icon
              name={isOpen ? "chevron-left" : "chevron-right"}
              size="35px"
              onClick={onClose}
              cursor="pointer"
            />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default StudentList;
