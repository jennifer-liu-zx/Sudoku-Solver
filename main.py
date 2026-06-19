import random
import copy

# easy
test_values_1 = [5, 0, 0, 4, 6, 7, 3, 0, 9,
                 9, 0, 3, 8, 1, 0, 4, 2, 7,
                 1, 7, 4, 2, 0, 3, 0, 0, 0,
                 2, 3, 1, 9, 7, 6, 8, 5, 4,
                 8, 5, 7, 1, 2, 4, 0, 9, 0,
                 4, 9, 6, 3, 0, 8, 1, 7, 2,
                 0, 0, 0, 0, 8, 9, 2, 6, 0,
                 7, 8, 2, 6, 4, 1, 0, 0, 5,
                 0, 1, 0, 0, 0, 0, 7, 0, 8]
test_values_2 = [3, 0, 0, 8, 0, 1, 0, 0, 2,
                 2, 0, 1, 0, 3, 0, 6, 0, 4,
                 0, 0, 0, 2, 0, 4, 0, 0, 0,
                 8, 0, 9, 0, 0, 0, 1, 0, 6,
                 0, 6, 0, 0, 0, 0, 0, 5, 0,
                 7, 0, 2, 0, 0, 0, 4, 0, 9,
                 0, 0, 0, 5, 0, 9, 0, 0, 0,
                 9, 0, 4, 0, 8, 0, 7, 0, 5,
                 6, 0, 0, 1, 0, 7, 0, 0, 3]

# intermediate
test_values_3 = [3, 0, 0, 6, 1, 0, 0, 0, 8,
                 0, 0, 2, 0, 3, 0, 7, 6, 0,
                 0, 0, 0, 7, 5, 0, 2, 9, 0,
                 0, 9, 0, 8, 0, 0, 0, 1, 0,
                 0, 4, 0, 1, 7, 3, 0, 5, 0,
                 0, 5, 0, 0, 0, 9, 0, 2, 0,
                 0, 3, 7, 0, 4, 1, 0, 0, 0,
                 0, 2, 5, 0, 8, 0, 9, 0, 0,
                 4, 0, 0, 0, 9, 7, 0, 0, 2]
test_values_4 = [0, 3, 0, 2, 0, 0, 0, 0, 0,
                 0, 8, 0, 0, 0, 9, 0, 6, 4,
                 0, 0, 2, 0, 4, 0, 8, 0, 0,
                 0, 7, 0, 0, 1, 0, 0, 0, 8,
                 0, 0, 1, 3, 0, 8, 5, 0, 0,
                 5, 0, 0, 0, 2, 0, 0, 4, 0,
                 0, 0, 4, 0, 6, 0, 3, 0, 0,
                 9, 5, 0, 1, 0, 0, 0, 8, 0,
                 0, 0, 0, 0, 0, 4, 0, 9, 0]

# hard
test_values_5 = [0, 0, 0, 0, 0, 4, 0, 0, 0,
                 0, 9, 8, 0, 0, 0, 0, 0, 0,
                 0, 0, 3, 0, 2, 8, 7, 4, 1,
                 0, 7, 9, 0, 0, 0, 0, 0, 0,
                 0, 0, 0, 0, 3, 0, 0, 0, 0,
                 0, 0, 0, 0, 0, 0, 6, 5, 0,
                 6, 2, 1, 4, 9, 0, 3, 0, 0,
                 0, 0, 0, 0, 0, 0, 4, 7, 0,
                 0, 0, 0, 6, 0, 0, 0, 0, 0]


def print_board(value_list):
    board = []
    for i in range(9):
        row = []
        for j in range(9):
            row.append(f"{value_list[i * 9 + j]} ")
        board.append(row)
    for row in board:
        print_row = ""
        for col in row:
            print_row += col
        print(print_row)


# removing possibilities for vertical and horizontal
def remove_possibilities_straight(all_possibilities, actual_value):
    for i in range(9):
        for j in range(9):
            k = i * 9 + j
            if actual_value[k] != 0:
                for a in range(9):
                    if actual_value[k] in all_possibilities[i * 9 + a]:
                        all_possibilities[i * 9 + a].remove(actual_value[k])
                for b in range(9):
                    if actual_value[k] in all_possibilities[b * 9 + j]:
                        all_possibilities[b * 9 + j].remove(actual_value[k])
    return all_possibilities


# sorting into small boxes (working good)
def sort_boxes(all_list):
    start_boxes = [0, 3, 6, 27, 30, 33, 54, 57, 60]
    grouped_list = []
    for group_num in range(9):
        grouped_list.append([])
        start = start_boxes[group_num]
        grouped_list[group_num] = []
        for box_num in [start, start + 1, start + 2,
                        start + 9, start + 10, start + 11,
                        start + 18, start + 19, start + 20]:
            grouped_list[group_num].append(all_list[box_num])
    return grouped_list


# unsort boxes
def unsort_boxes(sorted_list):
    compiled_sorted_list = {}
    all_list = {}
    for a in range(9):
        for b in range(9):
            compiled_sorted_list[a * 9 + b] = sorted_list[a][b]
    order_to_add = list(range(81))
    for x in range(81):
        all_list[x] = compiled_sorted_list[order_to_add[x]]
    return all_list


# removing possibilities for small boxes
def remove_possibilities_boxed(all_possibilities, actual_value):
    sorted_possibilities = sort_boxes(all_possibilities)
    sorted_values = sort_boxes(actual_value)
    for group_num in range(9):
        for order_in_group in range(9):
            if sorted_values[group_num][order_in_group] != 0:
                for a in range(9):
                    if sorted_values[group_num][order_in_group] in sorted_possibilities[group_num][a]:
                        sorted_possibilities[group_num][a].remove(sorted_values[group_num][order_in_group])
    unsorted_possibilities = unsort_boxes(sorted_possibilities)
    return unsorted_possibilities


def confirm_value(all_possibilities, x, actual_value):
    if actual_value[x] == 0 and len(all_possibilities[x]) == 1:
        actual_value[x] = all_possibilities[x][0]
    return actual_value[x]


# make assumption


def box_to_assume(all_values):
    for i in range(81):
        if all_values[i] == 0:
            return i


def choose_assumption(all_values, all_possibilities):
    copy_values = copy.deepcopy(all_values)
    copy_possibilities = copy.deepcopy(all_possibilities)
    box_pos = box_to_assume(all_values)
    if box_pos is not None:
        assumption = copy_possibilities[box_pos][0]
        copy_possibilities[box_pos].remove(assumption)
        all_possibilities[box_pos].remove(assumption)
        copy_values[box_pos] = assumption
    else:
        pass
    return copy_values, copy_possibilities


def group_values(all_values):
    boxes = sort_boxes(all_values)
    cols = []
    rows = []
    for i in range(9):
        rows.append([])
        cols.append([])
        for j in range(9):
            rows[i].append(all_values[i * 9 + j])
            cols[i].append(all_values[j * 9 + i])
    return rows, cols, boxes


def done(all_values): # checked
    nums_in_group = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    rows, cols, boxes = group_values(all_values)
    for i in range(9):
        rows[i].sort()
        cols[i].sort()
        boxes[i].sort()
        if rows[i] != nums_in_group or cols[i] != nums_in_group or boxes[i] != nums_in_group:
            return False
    return True


# checked
def wrong_assumption(all_values, all_possibilities):
    rows, cols, boxes = group_values(all_values)
    for grouping in rows, cols, boxes:
        for group in grouping:
            for i in group:
                if i != 0 and group.count(i) > 1:
                    return True
    for i in range(81):
        if all_values[i] == 0 and all_possibilities[i] == []:
            return True
    return False


def not_enough_info():
    return None
# when 50 rounds are up


def solve(all_values, all_possibilities):
    all_possibilities = remove_possibilities_straight(all_possibilities, all_values)
    all_possibilities = remove_possibilities_boxed(all_possibilities, all_values)
    for k in range(81):
        all_values[k] = confirm_value(all_possibilities, k, all_values)
    return all_values, all_possibilities


def sudoku_solver(value_input, all_possibilities={}):
    all_values = {}
    for k in range(81):
        all_possibilities[k] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        all_values[k] = value_input[k]

    rounds = 0
    while rounds < 15:
        rounds = 0
        while rounds < 15:
            all_values, all_possibilities = solve(all_values, all_possibilities)
            rounds += 1
        if done(all_values):
            return all_values, all_possibilities

        # assumption time

        rounds = 0
        while rounds < 15:
            if wrong_assumption(all_values, all_possibilities):
                break
            copy_values, copy_possibilities = choose_assumption(all_values, all_possibilities)
            copy_values, copy_possibilities = sudoku_solver(copy_values, copy_possibilities)
            if done(copy_values):
                return copy_values, copy_possibilities
            rounds += 1

        if wrong_assumption(all_values, all_possibilities):
            break
        rounds += 1

    return all_values, all_possibilities


print_board(test_values_5)
print()
values, possibilities = sudoku_solver(test_values_5)
print('solution:')
print_board(values)
